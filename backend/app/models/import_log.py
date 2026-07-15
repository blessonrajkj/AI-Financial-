from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.core.database import Base

class ImportLog(Base):
    __tablename__ = "import_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    filename = Column(String, nullable=False)
    imported_time = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    batch_id = Column(String, nullable=False, unique=True, index=True)
    transactions_count = Column(Integer, default=0)
    duplicates_count = Column(Integer, default=0)
    status = Column(String, default="Success")  # Success, Rolled Back
