from app.core.security import validate_password_strength, verify_password, get_password_hash

def test_password_policy_validation():
    valid, msg = validate_password_strength("Weak")
    assert not valid
    
    valid, msg = validate_password_strength("no_uppercase_123!")
    assert not valid
    
    valid, msg = validate_password_strength("NO_LOWERCASE_123!")
    assert not valid

    valid, msg = validate_password_strength("NoDigitsHere!")
    assert not valid

    valid, msg = validate_password_strength("NoSpecialChar123")
    assert not valid

    valid, msg = validate_password_strength("PariViewSecure@2026")
    assert valid

def test_password_hashing():
    pwd = "StrongPassword@123"
    hashed = get_password_hash(pwd)
    assert verify_password(pwd, hashed)
    assert not verify_password("WrongPassword@123", hashed)
