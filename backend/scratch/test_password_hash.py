from app.core.security import get_password_hash, verify_password

plain = "testpwd"
hashed = get_password_hash(plain)
print(f"Hashed: {hashed}")
verified = verify_password(plain, hashed)
print(f"Verified: {verified}")
