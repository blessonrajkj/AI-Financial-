import os
import sys
import io
import time
import sqlite3
import subprocess
from datetime import datetime, timezone
from openpyxl import Workbook
import fitz

sys.path.insert(0, 'backend')
from fastapi.testclient import TestClient
from sqlalchemy import text, func, case
from app.main import app
from app.core.database import SessionLocal, engine
from app.models.user import User
from app.models.transaction import Transaction
from app.models.budget import Budget
from app.models.savings_goal import SavingsGoal
from app.models.profile import UserProfile, UserSettings
from app.core.security import create_access_token, get_password_hash

PG_BIN = r"C:\Program Files\PostgreSQL\17\bin"
PG_DUMP = os.path.join(PG_BIN, "pg_dump.exe")
PG_RESTORE = os.path.join(PG_BIN, "pg_restore.exe")
PSQL = os.path.join(PG_BIN, "psql.exe")

def run():
    print("=" * 80)
    print("PARIVIEW COMPREHENSIVE FINANCIAL VERIFICATION PIPELINE (TASKS 1-4)")
    print("=" * 80)

    client = TestClient(app)
    db = SessionLocal()
    report = {}

    # =========================================================================
    # TASK 1: IMPORT RECONCILIATION
    # =========================================================================
    print("\n--- TASK 1: INDEPENDENT IMPORT RECONCILIATION ---")
    ts = int(time.time())
    test_user = User(
        email=f"import_reconcile_{ts}@example.com",
        hashed_password=get_password_hash("GeneratedTestingSecret_987!"),
        full_name="Import Reconciliation User",
        role="user",
        is_active=True
    )
    db.add(test_user)
    db.commit()
    db.refresh(test_user)
    uid = test_user.id
    token = create_access_token(uid)
    headers = {"Authorization": f"Bearer {token}"}

    try:
        # 1.1 SBI PDF Import
        sbi_path = "backend/tests/fixtures/sample_sbi_statement.pdf"
        assert os.path.exists(sbi_path), "SBI statement fixture missing"
        with open(sbi_path, "rb") as f:
            pdf_res = client.post(
                "/api/v1/transactions/upload-parse",
                headers=headers,
                files={"file": ("sample_sbi_statement.pdf", f, "application/pdf")}
            )
        assert pdf_res.status_code == 200, f"PDF upload failed: {pdf_res.text}"
        pdf_data = pdf_res.json()
        sbi_txs = pdf_data["transactions"]

        # Commit SBI transactions
        commit_res = client.post(
            "/api/v1/transactions/bulk-import",
            headers=headers,
            json={"transactions": sbi_txs, "duplicate_strategy": "skip"}
        )
        assert commit_res.status_code == 200
        print(f"SBI PDF: {len(sbi_txs)} transactions extracted, bulk-imported successfully.")

        # Direct SQL Query Reconcile SBI
        sbi_rows = db.query(Transaction).filter(Transaction.user_id == uid).all()
        sbi_income = sum(t.amount for t in sbi_rows if t.type == "income")
        sbi_expense = sum(t.amount for t in sbi_rows if t.type == "expense")
        sbi_net = sbi_income - sbi_expense
        print(f"   PostgreSQL Verification: Count={len(sbi_rows)}, Income=INR {sbi_income:,.2f}, Expense=INR {sbi_expense:,.2f}, Net=INR {sbi_net:,.2f}")
        assert len(sbi_rows) == 3
        assert sbi_income == 50000.0
        assert sbi_expense == 2540.0
        assert sbi_net == 47460.0

        # Check balances are stored in balance column, NOT amount
        for t in sbi_rows:
            assert t.amount in (50000.0, 540.0, 2000.0)
            assert t.balance in (49460.0, 99460.0, 97460.0)
        print("   Verified: Account balances are strictly stored in `balance` and excluded from `amount`.")

        # Clean user transactions for isolated CSV test
        db.query(Transaction).filter(Transaction.user_id == uid).delete()
        db.commit()

        # 1.2 CSV Import
        csv_content = """Date,Description,Amount,Type,Category
2026-09-01,Salary Credit,50000.00,income,Salary
2026-09-02,Swiggy Food Order,540.00,expense,Food & Dining
2026-09-05,Electricity Bill,3200.00,expense,Bills & Utilities
"""
        csv_res = client.post(
            "/api/v1/transactions/upload-parse",
            headers=headers,
            files={"file": ("statement.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}
        )
        assert csv_res.status_code == 200
        csv_txs = csv_res.json()["transactions"]
        client.post(
            "/api/v1/transactions/bulk-import",
            headers=headers,
            json={"transactions": csv_txs, "duplicate_strategy": "skip"}
        )
        csv_rows = db.query(Transaction).filter(Transaction.user_id == uid).all()
        csv_income = sum(t.amount for t in csv_rows if t.type == "income")
        csv_expense = sum(t.amount for t in csv_rows if t.type == "expense")
        csv_net = csv_income - csv_expense
        print(f"CSV Import: Count={len(csv_rows)}, Income=INR {csv_income:,.2f}, Expense=INR {csv_expense:,.2f}, Net=INR {csv_net:,.2f}")
        assert len(csv_rows) == 3
        assert csv_income == 50000.0
        assert csv_expense == 3740.0
        assert csv_net == 46260.0

        # Clean user transactions for isolated Excel test
        db.query(Transaction).filter(Transaction.user_id == uid).delete()
        db.commit()

        # 1.3 Excel Import
        wb = Workbook()
        ws = wb.active
        ws.append(["Date", "Description", "Amount", "Type", "Category"])
        ws.append(["2026-09-01", "Freelance Consulting Income Received", 50000.00, "income", "Business"])
        ws.append(["2026-09-03", "Grocery Mart Purchase", 2540.00, "expense", "Groceries"])
        ws.append(["2026-09-06", "Internet Broadband Bill", 1200.00, "expense", "Utilities"])
        excel_buf = io.BytesIO()
        wb.save(excel_buf)
        excel_buf.seek(0)

        xlsx_res = client.post(
            "/api/v1/transactions/upload-parse",
            headers=headers,
            files={"file": ("statement.xlsx", excel_buf, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
        )
        assert xlsx_res.status_code == 200
        xlsx_txs = xlsx_res.json()["transactions"]
        client.post(
            "/api/v1/transactions/bulk-import",
            headers=headers,
            json={"transactions": xlsx_txs, "duplicate_strategy": "skip"}
        )
        xlsx_rows = db.query(Transaction).filter(Transaction.user_id == uid).all()
        xlsx_income = sum(t.amount for t in xlsx_rows if t.type == "income")
        xlsx_expense = sum(t.amount for t in xlsx_rows if t.type == "expense")
        xlsx_net = xlsx_income - xlsx_expense
        print(f"Excel Import: Count={len(xlsx_rows)}, Income=INR {xlsx_income:,.2f}, Expense=INR {xlsx_expense:,.2f}, Net=INR {xlsx_net:,.2f}")
        assert len(xlsx_rows) == 3
        assert xlsx_income == 50000.0
        assert xlsx_expense == 3740.0
        assert xlsx_net == 46260.0

        # 1.4 Duplicate Detection
        dup_res = client.post(
            "/api/v1/transactions/bulk-import",
            headers=headers,
            json={"transactions": xlsx_txs, "duplicate_strategy": "skip"}
        )
        dup_data = dup_res.json()
        print(f"Duplicate Detection Test: Imported={dup_data['imported']}, Skipped={dup_data['skipped']}, Duplicates={dup_data['duplicates']}")
        assert dup_data["imported"] == 0
        assert dup_data["skipped"] == 3
        assert dup_data["duplicates"] == 3

        report["task1"] = "PASS"
    finally:
        db.query(Transaction).filter(Transaction.user_id == uid).delete()
        db.query(User).filter(User.id == uid).delete()
        db.commit()

    # =========================================================================
    # TASK 2: FINANCIAL LOGIC AND DASHBOARD RECONCILIATION
    # =========================================================================
    print("\n--- TASK 2: FINANCIAL CORRECTNESS & DASHBOARD RECONCILIATION ---")
    ts2 = int(time.time())
    fin_user = User(
        email=f"fin_math_{ts2}@example.com",
        hashed_password=get_password_hash("GeneratedTestingSecret_987!"),
        full_name="Financial Math User",
        role="user",
        is_active=True
    )
    db.add(fin_user)
    db.commit()
    db.refresh(fin_user)
    fin_uid = fin_user.id
    fin_token = create_access_token(fin_uid)
    fin_headers = {"Authorization": f"Bearer {fin_token}"}

    try:
        dt = datetime(2026, 9, 15, 12, 0, 0)
        tx1 = Transaction(user_id=fin_uid, amount=60000.0, type="income", description="Monthly Salary", date=dt)
        tx2 = Transaction(user_id=fin_uid, amount=4500.0, type="expense", description="Groceries", date=dt)
        tx3 = Transaction(user_id=fin_uid, amount=1500.0, type="expense", description="Utility Bill", date=dt)
        db.add_all([tx1, tx2, tx3])
        db.commit()

        # Check Initial Analytics
        ana_res = client.get("/api/v1/analytics/summary", headers=fin_headers)
        assert ana_res.status_code == 200
        ana_data = ana_res.json()
        print(f"Initial Analytics: Income={ana_data['monthly_income']}, Expense={ana_data['monthly_spending']}, Net Balance={ana_data['current_balance']}")
        assert ana_data["monthly_income"] == 60000.0
        assert ana_data["monthly_spending"] == 6000.0
        assert ana_data["current_balance"] == 54000.0

        # Transfer Invariant Check: Add 15,000 transfer
        tx_transfer = Transaction(user_id=fin_uid, amount=15000.0, type="transfer", description="Internal Account Transfer", date=dt)
        db.add(tx_transfer)
        db.commit()

        ana_res_after = client.get("/api/v1/analytics/summary", headers=fin_headers)
        ana_after = ana_res_after.json()
        print(f"After INR 15,000 Transfer: Income={ana_after['monthly_income']}, Expense={ana_after['monthly_spending']}, Net Balance={ana_after['current_balance']}")
        assert ana_after["monthly_income"] == 60000.0, "Transfer contaminated monthly income!"
        assert ana_after["monthly_spending"] == 6000.0, "Transfer contaminated monthly spending!"
        assert ana_after["current_balance"] == 54000.0, "Transfer contaminated net balance!"

        # SQL Aggregate Check
        sql_summary = db.query(
            func.sum(case((Transaction.type == "income", Transaction.amount), else_=0)).label("income"),
            func.sum(case((Transaction.type == "expense", Transaction.amount), else_=0)).label("spending")
        ).filter(Transaction.user_id == fin_uid).first()
        sql_inc = float(sql_summary.income or 0)
        sql_exp = float(sql_summary.spending or 0)
        sql_net = sql_inc - sql_exp
        print(f"Direct PostgreSQL Aggregation: Income={sql_inc}, Expense={sql_exp}, Net={sql_net}")
        assert sql_inc == ana_after["monthly_income"]
        assert sql_exp == ana_after["monthly_spending"]
        assert sql_net == ana_after["current_balance"]

        report["task2"] = "PASS"
    finally:
        db.query(Transaction).filter(Transaction.user_id == fin_uid).delete()
        db.query(User).filter(User.id == fin_uid).delete()
        db.commit()

    # =========================================================================
    # TASK 3: RECORD-LEVEL SQLITE VS POSTGRESQL COMPARISON
    # =========================================================================
    print("\n--- TASK 3: RECORD-LEVEL SQLITE VS POSTGRESQL COMPARISON ---")
    sqlite_path = "backend/finance.db"
    assert os.path.exists(sqlite_path), "SQLite finance.db missing"
    sqlite_mtime_before = os.path.getmtime(sqlite_path)

    # Connect read-only to SQLite
    sqlite_conn = sqlite3.connect(f"file:{sqlite_path}?mode=ro", uri=True)
    sqlite_cursor = sqlite_conn.cursor()

    sqlite_cursor.execute("SELECT id, email, full_name, role, is_active FROM users WHERE email = 'blessonrajkj200720@gmail.com'")
    u_sqlite = sqlite_cursor.fetchone()
    u_pg = db.query(User).filter(User.email == "blessonrajkj200720@gmail.com").first()
    assert u_sqlite is not None and u_pg is not None
    assert u_sqlite[0] == u_pg.id
    assert u_sqlite[1] == u_pg.email
    assert u_sqlite[2] == u_pg.full_name
    assert u_sqlite[3] == u_pg.role
    assert bool(u_sqlite[4]) == bool(u_pg.is_active)
    print(f"User Record Comparison: ID={u_pg.id}, Email={u_pg.email}, Role={u_pg.role}, Active={u_pg.is_active} (100% MATCH)")

    # Compare all 1,025 transactions for User 9
    sqlite_cursor.execute("SELECT id, amount, type, description, date, balance FROM transactions WHERE user_id = ? ORDER BY id ASC", (u_pg.id,))
    sq_txs = sqlite_cursor.fetchall()
    pg_txs = db.query(Transaction).filter(Transaction.user_id == u_pg.id).order_by(Transaction.id.asc()).all()

    print(f"Transactions Count: SQLite={len(sq_txs)}, PostgreSQL={len(pg_txs)}")
    assert len(sq_txs) == 1025, f"Expected 1025 SQLite transactions, found {len(sq_txs)}"
    assert len(pg_txs) == 1025, f"Expected 1025 PostgreSQL transactions, found {len(pg_txs)}"

    mismatches = []
    sq_total_sum = 0.0
    pg_total_sum = 0.0

    for sq_row, pg_row in zip(sq_txs, pg_txs):
        s_id, s_amt, s_type, s_desc, s_date, s_bal = sq_row
        sq_total_sum += float(s_amt or 0)
        pg_total_sum += float(pg_row.amount or 0)

        # Check ID
        if s_id != pg_row.id:
            mismatches.append(f"ID mismatch: SQLite {s_id} vs PG {pg_row.id}")
        # Check Amount
        if abs(float(s_amt) - float(pg_row.amount)) > 0.001:
            mismatches.append(f"Amount mismatch on ID {s_id}: SQLite {s_amt} vs PG {pg_row.amount}")
        # Check Type
        if s_type != pg_row.type:
            mismatches.append(f"Type mismatch on ID {s_id}: SQLite {s_type} vs PG {pg_row.type}")
        # Check Description
        if (s_desc or "").strip() != (pg_row.description or "").strip():
            mismatches.append(f"Desc mismatch on ID {s_id}: SQLite '{s_desc}' vs PG '{pg_row.description}'")
        # Check Date
        s_date_str = str(s_date)[:10]
        p_date_str = pg_row.date.strftime("%Y-%m-%d") if pg_row.date else ""
        if s_date_str != p_date_str:
            mismatches.append(f"Date mismatch on ID {s_id}: SQLite {s_date_str} vs PG {p_date_str}")
        # Check Balance
        if s_bal is not None and pg_row.balance is not None:
            if abs(float(s_bal) - float(pg_row.balance)) > 0.001:
                mismatches.append(f"Balance mismatch on ID {s_id}: SQLite {s_bal} vs PG {pg_row.balance}")

    print(f"Record-Level Transaction Evaluation: {len(sq_txs)} records evaluated.")
    print(f"Total Discrepancies Found: {len(mismatches)}")
    print(f"SQLite Sum:     INR {sq_total_sum:,.2f}")
    print(f"PostgreSQL Sum: INR {pg_total_sum:,.2f}")
    assert len(mismatches) == 0, f"Found {len(mismatches)} mismatches: {mismatches[:5]}"
    assert abs(sq_total_sum - pg_total_sum) < 0.01

    # Compare Budgets, Savings Goals, Settings, Profiles
    sqlite_cursor.execute("SELECT COUNT(*) FROM budgets WHERE user_id = ?", (u_pg.id,))
    sq_budgets = sqlite_cursor.fetchone()[0]
    pg_budgets = db.query(Budget).filter(Budget.user_id == u_pg.id).count()
    print(f"Budgets: SQLite={sq_budgets}, PG={pg_budgets}")
    assert sq_budgets == pg_budgets

    sqlite_cursor.execute("SELECT COUNT(*) FROM savings_goals WHERE user_id = ?", (u_pg.id,))
    sq_goals = sqlite_cursor.fetchone()[0]
    pg_goals = db.query(SavingsGoal).filter(SavingsGoal.user_id == u_pg.id).count()
    print(f"Savings Goals: SQLite={sq_goals}, PG={pg_goals}")
    assert sq_goals == pg_goals

    sqlite_conn.close()
    sqlite_mtime_after = os.path.getmtime(sqlite_path)
    assert sqlite_mtime_before == sqlite_mtime_after, "SQLite database was modified during verification!"
    print("Verified: SQLite recovery database remained completely untouched (mtime preserved).")
    report["task3"] = "PASS"

    # =========================================================================
    # TASK 4: POSTGRESQL BACKUP & RESTORATION
    # =========================================================================
    print("\n--- TASK 4: POSTGRESQL BACKUP & ISOLATED RESTORATION ---")
    os.makedirs("backups", exist_ok=True)
    dump_path = os.path.abspath("backups/pariview_backup.dump")
    
    from urllib.parse import urlparse
    from app.core.config import settings
    db_info = urlparse(settings.DATABASE_URL)
    pg_user = db_info.username or "postgres"
    pg_port = str(db_info.port or 5432)
    pg_host = db_info.hostname or "localhost"
    
    env = os.environ.copy()
    if db_info.password:
        env["PGPASSWORD"] = db_info.password

    # 4.1 Execute pg_dump
    dump_cmd = [PG_DUMP, "-U", pg_user, "-h", pg_host, "-p", pg_port, "-Fc", "-f", dump_path, "pariview"]
    dump_proc = subprocess.run(dump_cmd, env=env, capture_output=True, text=True)
    assert dump_proc.returncode == 0, f"pg_dump failed: {dump_proc.stderr}"
    dump_size = os.path.getsize(dump_path)
    print(f"pg_dump successful: File='{dump_path}', Size={dump_size:,} bytes")
    assert dump_size > 50000, "Dump file size abnormally small"

    # 4.2 Drop & Recreate pariview_restore_test
    drop_cmd = [PSQL, "-U", pg_user, "-h", pg_host, "-p", pg_port, "-c", "DROP DATABASE IF EXISTS pariview_restore_test;"]
    subprocess.run(drop_cmd, env=env, capture_output=True, text=True)
    create_cmd = [PSQL, "-U", pg_user, "-h", pg_host, "-p", pg_port, "-c", "CREATE DATABASE pariview_restore_test;"]
    create_proc = subprocess.run(create_cmd, env=env, capture_output=True, text=True)
    assert create_proc.returncode == 0, f"Failed to create test db: {create_proc.stderr}"

    # 4.3 Execute pg_restore
    restore_cmd = [PG_RESTORE, "-U", pg_user, "-h", pg_host, "-p", pg_port, "-d", "pariview_restore_test", dump_path]
    restore_proc = subprocess.run(restore_cmd, env=env, capture_output=True, text=True)
    print(f"pg_restore executed with return code {restore_proc.returncode} (custom format restored).")

    # 4.4 Verify table counts and financial totals in restored DB
    check_sql = """
    SELECT 
        (SELECT COUNT(*) FROM users) AS users_count,
        (SELECT COUNT(*) FROM transactions) AS transactions_count,
        (SELECT COUNT(*) FROM categories) AS categories_count,
        (SELECT COUNT(*) FROM merchants) AS merchants_count,
        (SELECT COUNT(*) FROM budgets) AS budgets_count,
        (SELECT COUNT(*) FROM savings_goals) AS goals_count,
        (SELECT COUNT(*) FROM user_profiles) AS profiles_count,
        (SELECT COUNT(*) FROM user_settings) AS settings_count,
        (SELECT COUNT(*) FROM notifications) AS notifs_count,
        (SELECT COUNT(*) FROM transactions WHERE user_id = 9) AS user9_tx_count,
        (SELECT SUM(amount) FROM transactions WHERE user_id = 9) AS user9_total_sum;
    """
    verify_cmd = [PSQL, "-U", pg_user, "-h", pg_host, "-p", pg_port, "-d", "pariview_restore_test", "-t", "-A", "-F", ",", "-c", check_sql]
    verify_proc = subprocess.run(verify_cmd, env=env, capture_output=True, text=True)
    assert verify_proc.returncode == 0, f"Verification query failed: {verify_proc.stderr}"
    tokens = verify_proc.stdout.strip().split(",")
    print(f"Restored Database Verification:")
    print(f"   Users:             {tokens[0]}")
    print(f"   Transactions:      {tokens[1]}")
    print(f"   Categories:        {tokens[2]}")
    print(f"   Merchants:         {tokens[3]}")
    print(f"   Budgets:           {tokens[4]}")
    print(f"   Savings Goals:     {tokens[5]}")
    print(f"   User Profiles:     {tokens[6]}")
    print(f"   User Settings:     {tokens[7]}")
    print(f"   Notifications:     {tokens[8]}")
    print(f"   User 9 Tx Count:   {tokens[9]}")
    print(f"   User 9 Total Sum:  INR {float(tokens[10]):,.2f}")

    assert int(tokens[9]) == 1025, f"Expected 1025 transactions for User 9, got {tokens[9]}"
    assert abs(float(tokens[10]) - 721029.26) < 0.1, f"Expected 721029.26, got {tokens[10]}"

    # Clean up restored test DB
    cleanup_cmd = [PSQL, "-U", pg_user, "-h", pg_host, "-p", pg_port, "-c", "DROP DATABASE IF EXISTS pariview_restore_test;"]
    subprocess.run(cleanup_cmd, env=env, capture_output=True, text=True)
    print("Cleaned up isolated database `pariview_restore_test`.")
    report["task4"] = "PASS"

    db.close()
    print("\n" + "=" * 80)
    print("ALL VERIFICATION PIPELINE TASKS COMPLETED SUCCESSFULLY:")
    for k, v in report.items():
        print(f"   {k.upper()}: {v}")
    print("=" * 80)

if __name__ == "__main__":
    run()
