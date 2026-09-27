from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class ImportBatch(Base):
    __tablename__ = "import_batches"

    id = Column(String, primary_key=True, index=True)  # e.g., UUID string or timestamp batch id
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    filename = Column(String, nullable=False)
    file_type = Column(String, nullable=False, default="statement")  # pdf, csv, excel, upi
    imported_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    total_records = Column(Integer, default=0)
    successful_records = Column(Integer, default=0)
    failed_records = Column(Integer, default=0)
    duplicate_records = Column(Integer, default=0)
    status = Column(String, default="Success")  # Success, Partial, Failed, Rolled Back
    error_summary = Column(Text, nullable=True)

    # Relationships
    user = relationship("User", back_populates="import_batches")
