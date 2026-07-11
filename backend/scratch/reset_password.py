import sqlite3
from app.core.security import get_password_hash

conn = sqlite3.connect("finance.db")
cursor = conn.cursor()

try:
    new_hash = get_password_hash("blesson123")
    cursor.execute(
        "UPDATE users SET hashed_password = ? WHERE email = ?",
        (new_hash, "blessonrajkj200720@gmail.com")
    )
    conn.commit()
    print("Password reset successfully for blessonrajkj200720@gmail.com to 'blesson123' via direct sqlite3!")
except Exception as e:
    print(f"Error resetting password: {e}")
finally:
    conn.close()
