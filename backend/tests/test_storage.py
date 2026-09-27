import os
import pytest
import tempfile
from moto import mock_aws
from app.services.storage import (
    LocalStorageProvider,
    S3StorageProvider,
    StorageService,
    generate_object_key,
    temp_file_for_processing
)
from app.core.config import settings

def test_generate_object_key():
    user_id = 42
    category = "receipts"
    filename = "invoice.pdf"
    
    key = generate_object_key(user_id, category, filename)
    assert key.startswith("users/42/receipts/")
    assert key.endswith(".pdf")
    
    # Test path traversal in filename
    bad_filename = "../../../etc/passwd.jpg"
    key2 = generate_object_key(user_id, category, bad_filename)
    assert ".." not in key2
    assert key2.startswith("users/42/receipts/")
    assert key2.endswith(".jpg")


def test_local_storage_provider(tmp_path):
    provider = LocalStorageProvider(base_dir=str(tmp_path))
    object_key = "users/1/receipts/test_file.txt"
    content = b"Hello, PariView Local Storage!"
    
    # Test upload
    returned_key = provider.upload_file(content, object_key, content_type="text/plain")
    assert returned_key == object_key
    assert provider.exists(object_key)
    
    # Test download
    downloaded = provider.download_file(object_key)
    assert downloaded == content
    
    # Test get_url
    url = provider.get_url(object_key)
    assert url == "/uploads/users/1/receipts/test_file.txt"
    
    # Test path traversal prevention raises ValueError
    bad_key = "../../secret.txt"
    with pytest.raises(ValueError, match="Path traversal attempt detected"):
        provider.upload_file(b"secret", bad_key)
    
    # Test delete
    deleted = provider.delete_file(object_key)
    assert deleted is True
    assert not provider.exists(object_key)


@mock_aws
def test_s3_storage_provider(monkeypatch):
    monkeypatch.setattr(settings, "STORAGE_BACKEND", "s3")
    monkeypatch.setattr(settings, "S3_BUCKET_NAME", "pariview-test-bucket")
    monkeypatch.setattr(settings, "S3_REGION", "us-east-1")
    monkeypatch.setattr(settings, "S3_ACCESS_KEY_ID", "testing")
    monkeypatch.setattr(settings, "S3_SECRET_ACCESS_KEY", "testing")
    monkeypatch.setattr(settings, "S3_ENDPOINT_URL", None)

    provider = S3StorageProvider()
    object_key = "users/1/receipts/test_s3_file.pdf"
    content = b"%PDF-1.4 Mock PDF Content for S3 Test"

    # Test upload
    returned_key = provider.upload_file(content, object_key, content_type="application/pdf")
    assert returned_key == object_key
    assert provider.exists(object_key)

    # Test download
    downloaded = provider.download_file(object_key)
    assert downloaded == content

    # Test pre-signed URL generation
    presigned_url = provider.get_url(object_key, expires_in=1800)
    assert "pariview-test-bucket" in presigned_url or "s3.amazonaws.com" in presigned_url

    # Test delete
    deleted = provider.delete_file(object_key)
    assert deleted is True
    assert not provider.exists(object_key)


def test_temp_file_for_processing(tmp_path):
    provider = LocalStorageProvider(base_dir=str(tmp_path))
    storage_svc = StorageService(backend_type="local")
    storage_svc.provider = provider
    
    object_key = "users/10/statements/sample.csv"
    data = b"date,amount,description\n2026-01-01,100,Salary"
    provider.upload_file(data, object_key)
    
    temp_path_captured = None
    with temp_file_for_processing(storage_svc, object_key, suffix=".csv") as temp_path:
        temp_path_captured = temp_path
        assert os.path.exists(temp_path)
        with open(temp_path, "rb") as f:
            assert f.read() == data
            
    # Verify cleanup after context exit
    assert not os.path.exists(temp_path_captured)


def test_user_isolation(tmp_path):
    provider = LocalStorageProvider(base_dir=str(tmp_path))
    key_user_a = generate_object_key(1, "receipts", "rec_a.png")
    key_user_b = generate_object_key(2, "receipts", "rec_b.png")
    
    provider.upload_file(b"User A Data", key_user_a)
    provider.upload_file(b"User B Data", key_user_b)
    
    assert key_user_a.startswith("users/1/")
    assert key_user_b.startswith("users/2/")
    assert provider.download_file(key_user_a) != provider.download_file(key_user_b)
