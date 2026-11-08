import os
import sys
import time
import tracemalloc
import csv
import io
from datetime import datetime, timedelta
from decimal import Decimal

# Ensure backend is on sys.path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.models.user import User
from app.models.transaction import Transaction
from app.models.category_merchant import Category, Merchant
from app.core.security import create_access_token, get_password_hash
from app.services.tabular_parser import tabular_parser
from app.services.category_taxonomy import auto_categorize
from app.api.v1.endpoints.transactions import batch_detect_duplicates

def generate_csv_data(num_rows: int) -> str:
    """Generates synthetic CSV statement data with realistic bank transaction patterns."""
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Date", "Description", "Ref No", "Debit", "Credit", "Balance"])
    
    start_date = datetime(2026, 1, 1, 10, 0, 0)
    balance = 100000.0
    
    merchants_expenses = [
        ("UPI-SWIGGY-123456789012@okaxis", 450.0),
        ("AMAZON RETAIL INDIA PVT LTD", 1299.0),
        ("ZOMATO ONLINE ORDER /456789123456/", 320.0),
        ("UBER INDIA RIDES", 280.0),
        ("NETFLIX SUBSCRIPTION", 649.0),
        ("INDIAN OIL PETROL PUMP", 2000.0),
        ("BIG BAZAAR SUPERMARKET", 3450.0),
        ("STARBUCKS COFFEE IND", 410.0),
    ]
    
    income_sources = [
        ("SALARY CREDITED BY ACME CORP", 65000.0),
        ("INTEREST CREDIT FOR Q3", 1250.0),
        ("FREELANCE CONSULTING INFLOW", 15000.0),
        ("CASHBACK REWARD REFUND", 150.0),
    ]

    for i in range(num_rows):
        cur_date = start_date + timedelta(hours=i * 2)
        date_str = cur_date.strftime("%d/%m/%Y")
        ref_no = f"UTR{100000000000 + i}"
        
        if i % 15 == 0:
            # Income
            src_desc, amt = income_sources[i % len(income_sources)]
            balance += amt
            writer.writerow([date_str, src_desc, ref_no, "", f"{amt:.2f}", f"{balance:.2f}"])
        else:
            # Expense
            m_desc, amt = merchants_expenses[i % len(merchants_expenses)]
            balance -= amt
            writer.writerow([date_str, m_desc, ref_no, f"{amt:.2f}", "", f"{balance:.2f}"])
            
    return output.getvalue()

def run_benchmarks():
    print("=" * 80)
    print("PARIVIEW CSV STATEMENT INGESTION PIPELINE BENCHMARK")
    print("=" * 80)
    print(f"Timestamp: {datetime.now().isoformat()}")
    print("Database: PostgreSQL 17")
    print("-" * 80)

    client = TestClient(app)
    db = SessionLocal()

    # Create isolated benchmark user
    bench_email = "csv_benchmark_runner@example.com"
    user = db.query(User).filter(User.email == bench_email).first()
    if not user:
        user = User(
            email=bench_email,
            hashed_password=get_password_hash("BenchPass123!"),
            full_name="CSV Benchmark Runner",
            role="user",
            is_active=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    user_id = user.id
    token = create_access_token(user_id)
    headers = {"Authorization": f"Bearer {token}"}

    test_scales = [100, 1000, 5000, 10000]
    results_summary = []

    for n in test_scales:
        print(f"\n>>> Running Benchmark for {n:,} rows...")

        # 1. Clean previous transactions for clean slate
        db.query(Transaction).filter(Transaction.user_id == user_id).delete(synchronize_session=False)
        db.commit()

        # Generate CSV payload
        csv_text = generate_csv_data(n)
        csv_bytes = csv_text.encode("utf-8")

        # Track memory and CPU
        tracemalloc.start()
        start_cpu = time.process_time()
        start_total_wall = time.perf_counter()

        # Phase A: File Read Time
        t0 = time.perf_counter()
        reader = csv.reader(io.StringIO(csv_text))
        raw_rows = list(reader)
        read_time_ms = (time.perf_counter() - t0) * 1000

        # Phase B: Tabular Parsing Time (Headers + fast date + amount)
        t0 = time.perf_counter()
        parsed_txs, invalid_rows = tabular_parser.parse_tabular_data(raw_rows, "Generic CSV")
        parse_time_ms = (time.perf_counter() - t0) * 1000

        # Phase C: Auto-Categorization Time (profiled isolated)
        t0 = time.perf_counter()
        for r in raw_rows[1:]:
            if len(r) > 1:
                auto_categorize("expense", "Generic", r[1])
        categorize_time_ms = (time.perf_counter() - t0) * 1000

        # Phase D: Duplicate Detection Time (Batch query & matching)
        t0 = time.perf_counter()
        dup_results = batch_detect_duplicates(db, user_id, parsed_txs)
        dup_time_ms = (time.perf_counter() - t0) * 1000

        # Phase E: End-to-End POST /upload-parse via API
        t0 = time.perf_counter()
        res_parse = client.post(
            "/api/v1/transactions/upload-parse",
            headers=headers,
            files={"file": (f"statement_{n}.csv", csv_bytes, "text/csv")}
        )
        upload_parse_ms = (time.perf_counter() - t0) * 1000
        assert res_parse.status_code == 200, f"upload-parse failed: {res_parse.text}"
        parse_resp_data = res_parse.json()
        tx_items = parse_resp_data["transactions"]
        assert len(tx_items) == n, f"Expected {n} parsed transactions, got {len(tx_items)}"

        # Phase F: End-to-End POST /bulk-import via API
        t0 = time.perf_counter()
        res_import = client.post(
            "/api/v1/transactions/bulk-import",
            headers=headers,
            json={"transactions": tx_items, "duplicate_strategy": "skip"}
        )
        bulk_import_ms = (time.perf_counter() - t0) * 1000
        assert res_import.status_code == 200, f"bulk-import failed: {res_import.text}"
        import_resp_data = res_import.json()
        assert import_resp_data["imported"] == n, f"Expected {n} imported, got {import_resp_data['imported']}"

        # Phase G: Verify Duplicate Detection on Re-Upload
        t0 = time.perf_counter()
        res_reparse = client.post(
            "/api/v1/transactions/upload-parse",
            headers=headers,
            files={"file": (f"statement_{n}.csv", csv_bytes, "text/csv")}
        )
        reparse_ms = (time.perf_counter() - t0) * 1000
        reparse_data = res_reparse.json()
        assert reparse_data["summary"]["duplicate_count"] == n, f"Expected {n} duplicates, got {reparse_data['summary']['duplicate_count']}"

        total_wall_s = time.perf_counter() - start_total_wall
        total_cpu_s = time.process_time() - start_cpu
        cpu_util = (total_cpu_s / total_wall_s * 100) if total_wall_s > 0 else 0.0

        current_mem, peak_mem = tracemalloc.get_traced_memory()
        tracemalloc.stop()
        peak_mem_mb = peak_mem / (1024 * 1024)

        # Database verification: Count records in PostgreSQL
        pg_count = db.query(Transaction).filter(Transaction.user_id == user_id).count()
        assert pg_count == n, f"PostgreSQL count {pg_count} != {n}"

        total_ingestion_s = (upload_parse_ms + bulk_import_ms) / 1000.0

        results_summary.append({
            "rows": n,
            "read_ms": read_time_ms,
            "parse_ms": parse_time_ms,
            "categorize_ms": categorize_time_ms,
            "dup_ms": dup_time_ms,
            "upload_parse_ms": upload_parse_ms,
            "bulk_import_ms": bulk_import_ms,
            "total_ingestion_s": total_ingestion_s,
            "reparse_dup_check_ms": reparse_ms,
            "peak_mem_mb": peak_mem_mb,
            "cpu_util_pct": cpu_util,
            "pg_verified_count": pg_count
        })

        print(f"  Rows: {n:,}")
        print(f"  File Read:                {read_time_ms:.2f} ms")
        print(f"  Tabular Parse:            {parse_time_ms:.2f} ms")
        print(f"  Auto-Categorization:      {categorize_time_ms:.2f} ms")
        print(f"  Duplicate Detection:      {dup_time_ms:.2f} ms")
        print(f"  POST /upload-parse:       {upload_parse_ms:.2f} ms ({upload_parse_ms/1000:.3f} s)")
        print(f"  POST /bulk-import:        {bulk_import_ms:.2f} ms ({bulk_import_ms/1000:.3f} s)")
        print(f"  Total Ingestion Time:     {total_ingestion_s:.3f} s")
        print(f"  Re-upload Duplicate Scan: {reparse_ms:.2f} ms ({reparse_data['summary']['duplicate_count']}/{n} duplicates identified)")
        print(f"  Peak Memory:              {peak_mem_mb:.2f} MB")
        print(f"  CPU Utilization:          {cpu_util:.1f} %")
        print(f"  PostgreSQL Verified:      {pg_count:,} rows")

    # Clean up benchmark user data
    db.query(Transaction).filter(Transaction.user_id == user_id).delete(synchronize_session=False)
    db.query(User).filter(User.id == user_id).delete(synchronize_session=False)
    db.commit()
    db.close()

    print("\n" + "=" * 80)
    print("FINAL BENCHMARK PERFORMANCE SUMMARY")
    print("=" * 80)
    print(f"{'Scale':<10} | {'Read':<10} | {'Parse':<10} | {'Dup Check':<10} | {'Upload-Parse':<14} | {'Bulk-Import':<14} | {'Total Ingest':<14} | {'Peak Mem':<10}")
    print("-" * 96)
    for r in results_summary:
        print(f"{r['rows']:<10,} | {r['read_ms']:<8.2f}ms | {r['parse_ms']:<8.2f}ms | {r['dup_ms']:<8.2f}ms | {r['upload_parse_ms']/1000:<11.3f}s | {r['bulk_import_ms']/1000:<11.3f}s | {r['total_ingestion_s']:<11.3f}s | {r['peak_mem_mb']:<7.2f}MB")
    print("=" * 80)

if __name__ == "__main__":
    run_benchmarks()
