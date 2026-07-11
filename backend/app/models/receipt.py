from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class Receipt(Base):
    __tablename__ = "receipts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    file_path = Column(String, nullable=False)
    merchant_name = Column(String, nullable=True)
    total_amount = Column(Float, nullable=True)
    tax_amount = Column(Float, nullable=True)
    transaction_date = Column(DateTime(timezone=True), nullable=True)
    extracted_data = Column(JSON, nullable=True)  # Store items list, metadata
    status = Column(String, default="pending")  # pending, parsed, failed
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="receipts")
    transactions = relationship("Transaction", back_populates="receipt")
