import os
import uuid
import tempfile
from abc import ABC, abstractmethod
from typing import Optional, Generator
from contextlib import contextmanager
from app.core.config import settings

class BaseStorageProvider(ABC):
    @abstractmethod
    def upload_file(self, file_data: bytes, object_key: str, content_type: Optional[str] = None) -> str:
        """Upload binary file data and return object key/path."""
        pass

    @abstractmethod
    def download_file(self, object_key: str) -> bytes:
        """Download binary file data from storage."""
        pass

    @abstractmethod
    def delete_file(self, object_key: str) -> bool:
        """Delete file from storage."""
        pass

    @abstractmethod
    def exists(self, object_key: str) -> bool:
        """Check if object key exists in storage."""
        pass

    @abstractmethod
    def get_url(self, object_key: str, expires_in: int = 3600) -> str:
        """Get accessible URL or pre-signed URL for the object."""
        pass


class LocalStorageProvider(BaseStorageProvider):
    def __init__(self, base_dir: str = settings.UPLOAD_DIR):
        self.base_dir = base_dir
        os.makedirs(self.base_dir, exist_ok=True)

    def _resolve_path(self, object_key: str) -> str:
        # Sanitize object key and prevent path traversal outside base_dir
        clean_key = os.path.normpath(object_key.lstrip("/\\"))
        full_path = os.path.abspath(os.path.join(self.base_dir, clean_key))
        base_path = os.path.abspath(self.base_dir)
        if not full_path.startswith(base_path):
            raise ValueError(f"Path traversal attempt detected: {object_key}")
        return full_path

    def upload_file(self, file_data: bytes, object_key: str, content_type: Optional[str] = None) -> str:
        full_path = self._resolve_path(object_key)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        with open(full_path, "wb") as f:
            f.write(file_data)
        return object_key

    def download_file(self, object_key: str) -> bytes:
        full_path = self._resolve_path(object_key)
        if not os.path.exists(full_path):
            raise FileNotFoundError(f"File not found in local storage: {object_key}")
        with open(full_path, "rb") as f:
            return f.read()

    def delete_file(self, object_key: str) -> bool:
        full_path = self._resolve_path(object_key)
        if os.path.exists(full_path):
            os.remove(full_path)
            return True
        return False

    def exists(self, object_key: str) -> bool:
        full_path = self._resolve_path(object_key)
        return os.path.exists(full_path)

    def get_url(self, object_key: str, expires_in: int = 3600) -> str:
        clean_key = object_key.lstrip("/")
        return f"/uploads/{clean_key}"


class S3StorageProvider(BaseStorageProvider):
    def __init__(self):
        import boto3
        from botocore.config import Config

        self.bucket_name = settings.S3_BUCKET_NAME
        s3_kwargs = {"region_name": settings.S3_REGION}

        if settings.S3_ENDPOINT_URL:
            s3_kwargs["endpoint_url"] = settings.S3_ENDPOINT_URL
        if settings.S3_ACCESS_KEY_ID and settings.S3_SECRET_ACCESS_KEY:
            s3_kwargs["aws_access_key_id"] = settings.S3_ACCESS_KEY_ID
            s3_kwargs["aws_secret_access_key"] = settings.S3_SECRET_ACCESS_KEY

        self.client = boto3.client("s3", **s3_kwargs)
        self._ensure_bucket_exists()

    def _ensure_bucket_exists(self):
        try:
            self.client.head_bucket(Bucket=self.bucket_name)
        except Exception:
            try:
                self.client.create_bucket(Bucket=self.bucket_name)
            except Exception:
                pass

    def upload_file(self, file_data: bytes, object_key: str, content_type: Optional[str] = None) -> str:
        extra_args = {}
        if content_type:
            extra_args["ContentType"] = content_type

        clean_key = object_key.lstrip("/")
        self.client.put_object(
            Bucket=self.bucket_name,
            Key=clean_key,
            Body=file_data,
            **extra_args
        )
        return clean_key

    def download_file(self, object_key: str) -> bytes:
        clean_key = object_key.lstrip("/")
        response = self.client.get_object(Bucket=self.bucket_name, Key=clean_key)
        return response["Body"].read()

    def delete_file(self, object_key: str) -> bool:
        clean_key = object_key.lstrip("/")
        try:
            self.client.delete_object(Bucket=self.bucket_name, Key=clean_key)
            return True
        except Exception:
            return False

    def exists(self, object_key: str) -> bool:
        clean_key = object_key.lstrip("/")
        try:
            self.client.head_object(Bucket=self.bucket_name, Key=clean_key)
            return True
        except Exception:
            return False

    def get_url(self, object_key: str, expires_in: int = 3600) -> str:
        clean_key = object_key.lstrip("/")
        return self.client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self.bucket_name, "Key": clean_key},
            ExpiresIn=expires_in
        )


class StorageService:
    def __init__(self, backend_type: Optional[str] = None):
        self.backend_type = (backend_type or settings.STORAGE_BACKEND).lower()
        if self.backend_type == "s3":
            self.provider: BaseStorageProvider = S3StorageProvider()
        else:
            self.provider: BaseStorageProvider = LocalStorageProvider()

    def upload_file(self, file_data: bytes, object_key: str, content_type: Optional[str] = None) -> str:
        return self.provider.upload_file(file_data, object_key, content_type)

    def download_file(self, object_key: str) -> bytes:
        return self.provider.download_file(object_key)

    def delete_file(self, object_key: str) -> bool:
        return self.provider.delete_file(object_key)

    def exists(self, object_key: str) -> bool:
        return self.provider.exists(object_key)

    def get_url(self, object_key: str, expires_in: int = 3600) -> str:
        return self.provider.get_url(object_key, expires_in)


def generate_object_key(user_id: int, category: str, original_filename: str) -> str:
    """Generate clean, sanitized, user-isolated object key: users/{user_id}/{category}/{uuid}.{ext}"""
    ext = os.path.splitext(original_filename)[1].lower() or ".bin"
    # Ensure extension is safe
    safe_ext = ext if ext in [".pdf", ".csv", ".xlsx", ".xls", ".png", ".jpg", ".jpeg", ".webp"] else ".bin"
    unique_id = uuid.uuid4().hex
    return f"users/{user_id}/{category}/{unique_id}{safe_ext}"


def generate_signed_url(object_key: str, user_id: int, expires_in: int = 3600) -> str:
    """Generate a tamper-proof short-lived signed URL for a specific user and object."""
    import hmac
    import hashlib
    import time
    clean_key = object_key.lstrip("/\\")
    exp = int(time.time()) + expires_in
    payload = f"{clean_key}:{user_id}:{exp}"
    signature = hmac.new(settings.SECRET_KEY.encode(), payload.encode(), hashlib.sha256).hexdigest()
    return f"/uploads/{clean_key}?uid={user_id}&exp={exp}&sig={signature}"


@contextmanager
def temp_file_for_processing(storage_service: StorageService, object_key: str, suffix: str = ".tmp") -> Generator[str, None, None]:
    """
    Context manager that downloads an object into a temporary local file for OCR/PyMuPDF/OpenCV,
    yielding the temporary local path and deleting it upon context exit.
    """
    data = storage_service.download_file(object_key)
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(data)
        tmp_path = tmp.name

    try:
        yield tmp_path
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


storage_service = StorageService()
