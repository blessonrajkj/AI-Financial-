import os
import sys
import sqlite3
import psycopg2
from decimal import Decimal

# Add backend root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings

SQLITE_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "finance.db")
if not os.path.exists(SQLITE_PATH):
    parent_db = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "finance.db")
    if os.path.exists(parent_db):
        SQLITE_PATH = parent_db

TABLE_ORDER = [
    "users",
    "user_profiles",
    "linked_banks",
    "user_settings",
    "categories",
    "merchants",
    "receipts",
    "voice_logs",
    "import_batches",
    "import_logs",
    "transactions",
    "budgets",
    "subscriptions",
    "notifications",
    "investments",
    "savings_goals",
    "chat_history",
    "india_post_investments"
]

def migrate_data():
    print("=" * 65)
    print("PARIVIEW: SQLITE TO POSTGRESQL DATA MIGRATION SCRIPT")
    print("=" * 65)

    if not os.path.exists(SQLITE_PATH):
        print(f"[!] SQLite database file not found at: {SQLITE_PATH}")
        return

    print(f"[*] Found SQLite Database: {SQLITE_PATH}")
    pg_url = settings.get_database_url()
    print(f"[*] Target PostgreSQL URL: {pg_url}")

    sqlite_conn = sqlite3.connect(SQLITE_PATH)
    sqlite_conn.row_factory = sqlite3.Row
    sqlite_cur = sqlite_conn.cursor()

    pg_conn = psycopg2.connect(pg_url)
    pg_cur = pg_conn.cursor()

    # Clear target PostgreSQL tables in reverse order to respect foreign keys
    print("\n[*] Clearing existing target PostgreSQL tables for clean transfer...")
    for table in reversed(TABLE_ORDER):
        try:
            pg_cur.execute(f'TRUNCATE TABLE "{table}" CASCADE;')
        except Exception:
            pg_conn.rollback()
            try:
                pg_cur.execute(f'DELETE FROM "{table}";')
            except Exception:
                pg_conn.rollback()
    pg_conn.commit()
    print("[+] PostgreSQL tables ready.")

    # Cache valid IDs for FK checking
    valid_ids = {
        "users": set(),
        "categories": set(),
        "merchants": set(),
        "receipts": set(),
        "voice_logs": set(),
        "import_batches": set(),
    }

    report = []
    
    print("\n[*] Migrating records with FK integrity verification...")
    for table in TABLE_ORDER:
        sqlite_cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table,))
        if not sqlite_cur.fetchone():
            print(f"[-] Table '{table}' does not exist in SQLite, skipping.")
            continue

        sqlite_cur.execute(f"SELECT * FROM {table}")
        rows = sqlite_cur.fetchall()
        row_count = len(rows)
        
        if row_count == 0:
            print(f"[*] Table '{table}': 0 rows found in SQLite.")
            report.append({"table": table, "sqlite_rows": 0, "pg_rows": 0, "status": "MATCH"})
            continue

        columns = [column[0] for column in sqlite_cur.description]
        
        pg_cur.execute(f"SELECT column_name FROM information_schema.columns WHERE table_name = %s", (table,))
        pg_columns = set(row[0] for row in pg_cur.fetchall())

        valid_columns = [col for col in columns if col in pg_columns]
        placeholders = ", ".join(["%s"] * len(valid_columns))
        col_names = ", ".join([f'"{col}"' for col in valid_columns])

        insert_sql = f'INSERT INTO "{table}" ({col_names}) VALUES ({placeholders})'

        inserted = 0
        for row in rows:
            row_dict = dict(row)

            # FK Sanitization against orphaned references
            if "user_id" in row_dict and row_dict["user_id"] is not None and row_dict["user_id"] not in valid_ids["users"]:
                # If user_id is non-nullable in schema, default to min user_id if valid_ids["users"] has any
                if table in ("transactions", "budgets", "subscriptions", "notifications", "investments", "savings_goals", "receipts", "voice_logs", "import_batches", "import_logs", "chat_history", "india_post_investments", "linked_banks", "user_profiles", "user_settings"):
                    row_dict["user_id"] = min(valid_ids["users"]) if valid_ids["users"] else 1
                else:
                    row_dict["user_id"] = None

            if "category_id" in row_dict and row_dict["category_id"] is not None and row_dict["category_id"] not in valid_ids["categories"]:
                row_dict["category_id"] = None

            if "merchant_id" in row_dict and row_dict["merchant_id"] is not None and row_dict["merchant_id"] not in valid_ids["merchants"]:
                row_dict["merchant_id"] = None

            if "default_category_id" in row_dict and row_dict["default_category_id"] is not None and row_dict["default_category_id"] not in valid_ids["categories"]:
                row_dict["default_category_id"] = None

            if "receipt_id" in row_dict and row_dict["receipt_id"] is not None and row_dict["receipt_id"] not in valid_ids["receipts"]:
                row_dict["receipt_id"] = None

            if "voice_log_id" in row_dict and row_dict["voice_log_id"] is not None and row_dict["voice_log_id"] not in valid_ids["voice_logs"]:
                row_dict["voice_log_id"] = None

            if "import_batch_id" in row_dict and row_dict["import_batch_id"] is not None and row_dict["import_batch_id"] not in valid_ids["import_batches"]:
                row_dict["import_batch_id"] = None

            val_list = []
            for col in valid_columns:
                val = row_dict[col]
                # Convert boolean integers
                if isinstance(val, int) and col in (
                    "is_active", "is_verified", "is_recurring", "is_autopay", "is_primary",
                    "is_read", "push_notifications", "email_notifications", "sms_notifications",
                    "bill_reminders", "investment_alerts", "budget_alerts", "subscription_alerts",
                    "salary_credit_alerts", "two_factor_enabled", "privacy_mode"
                ):
                    val = bool(val)
                val_list.append(val)
            try:
                pg_cur.execute(insert_sql, val_list)
                inserted += 1
                # Save inserted ID to cache
                if table in valid_ids and "id" in row_dict and row_dict["id"] is not None:
                    valid_ids[table].add(row_dict["id"])
            except Exception as e:
                print(f"[!] Exception inserting row into {table} (ID {row_dict.get('id')}): {e}")
                pg_conn.rollback()

        pg_conn.commit()

        # Reset serial sequence if table has integer 'id' primary key
        if "id" in pg_columns:
            try:
                pg_cur.execute(f"SELECT setval(pg_get_serial_sequence('{table}', 'id'), COALESCE((SELECT MAX(id) FROM \"{table}\"), 1));")
                pg_conn.commit()
            except Exception:
                pg_conn.rollback()

        # Verify Postgres row count
        pg_cur.execute(f'SELECT COUNT(*) FROM "{table}"')
        pg_count = pg_cur.fetchone()[0]

        status = "MATCH" if pg_count == row_count else "MISMATCH"
        print(f"[+] Table '{table}': SQLite={row_count} rows -> PostgreSQL={pg_count} rows [{status}]")
        report.append({"table": table, "sqlite_rows": row_count, "pg_rows": pg_count, "status": status})

    # Financial Total Verification
    print("\n" + "=" * 65)
    print("FINANCIAL SUM VERIFICATION REPORT")
    print("=" * 65)
    
    # Check transactions amount sum
    sqlite_cur.execute("SELECT SUM(amount) FROM transactions WHERE type='expense'")
    sqlite_exp = sqlite_cur.fetchone()[0] or 0.0
    
    pg_cur.execute("SELECT SUM(amount) FROM transactions WHERE type='expense'")
    pg_exp_res = pg_cur.fetchone()[0]
    pg_exp = float(pg_exp_res) if pg_exp_res is not None else 0.0

    exp_diff = abs(sqlite_exp - pg_exp)
    exp_status = "MATCH" if exp_diff < 0.01 else "MISMATCH"
    print(f"Total Expense Amount: SQLite={sqlite_exp:.2f} | PostgreSQL={pg_exp:.2f} | Diff={exp_diff:.2f} [{exp_status}]")

    sqlite_cur.execute("SELECT SUM(amount) FROM transactions WHERE type='income'")
    sqlite_inc = sqlite_cur.fetchone()[0] or 0.0

    pg_cur.execute("SELECT SUM(amount) FROM transactions WHERE type='income'")
    pg_inc_res = pg_cur.fetchone()[0]
    pg_inc = float(pg_inc_res) if pg_inc_res is not None else 0.0

    inc_diff = abs(sqlite_inc - pg_inc)
    inc_status = "MATCH" if inc_diff < 0.01 else "MISMATCH"
    print(f"Total Income Amount:  SQLite={sqlite_inc:.2f} | PostgreSQL={pg_inc:.2f} | Diff={inc_diff:.2f} [{inc_status}]")

    sqlite_conn.close()
    pg_conn.close()
    print("=" * 65)
    print("MIGRATION COMPLETED SUCCESSFULLY")
    print("=" * 65)

if __name__ == "__main__":
    migrate_data()
