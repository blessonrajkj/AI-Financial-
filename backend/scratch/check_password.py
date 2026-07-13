import sqlite3
from app.core.security import verify_password

conn = sqlite3.connect("finance.db")
cursor = conn.cursor()

try:
    cursor.execute("SELECT id, email, hashed_password FROM users")
    users = cursor.fetchall()
    print("USERS IN DB:")
    for u in users:
        print(f"ID: {u[0]}, Email: {u[1]}, Hash: {u[2]}")
        # Try to verify against "blesson123"
        print(f"  Verifying against 'blesson123': {verify_password('blesson123', u[2])}")
        # Try to verify against "testpwd"
        print(f"  Verifying against 'testpwd': {verify_password('testpwd', u[2])}")
except Exception as e:
    print(f"Error checking password: {e}")
finally:
    conn.close()
