import sqlite3

conn = sqlite3.connect("finance.db")
cursor = conn.cursor()

try:
    cursor.execute("SELECT id, email, full_name, hashed_password FROM users")
    users = cursor.fetchall()
    print("Users in database:")
    for u in users:
        print(f"ID: {u[0]}, Email: {u[1]}, Name: {u[2]}, Hashed Pwd: {u[3]}")
except Exception as e:
    print(f"Error querying users: {e}")
finally:
    conn.close()
