from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    amount = Column(Float, nullable=False)
    date = Column(DateTime(timezone=True), default=func.now(), nullable=False)
    description = Column(String, nullable=True)
    category_id = Column(Integer, ForeignKey("categories.id", ondelete="SET NULL"), nullable=True)
    merchant_id = Column(Integer, ForeignKey("merchants.id", ondelete="SET NULL"), nullable=True)
    payment_method = Column(String, default="Cash")  # Cash, Credit Card, Debit Card, UPI, Net Banking
    type = Column(String, default="expense")  # expense, income
    is_recurring = Column(Boolean, default=False)
    receipt_id = Column(Integer, ForeignKey("receipts.id", ondelete="SET NULL"), nullable=True)
    voice_log_id = Column(Integer, ForeignKey("voice_logs.id", ondelete="SET NULL"), nullable=True)
    tags = Column(String, nullable=True)  # Comma-separated tags e.g., "vacation,dinner"
    import_batch_id = Column(String, nullable=True, index=True)
    transaction_id = Column(String, nullable=True, index=True)
    reference_number = Column(String, nullable=True, index=True)
    bank = Column(String, nullable=True)
    balance = Column(Float, nullable=True)
    debit_amount = Column(Float, nullable=True)
    credit_amount = Column(Float, nullable=True)
    post_date = Column(String, nullable=True)
    time = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="transactions")
    category = relationship("Category", back_populates="transactions")
    merchant = relationship("Merchant", back_populates="transactions")
    receipt = relationship("Receipt", back_populates="transactions")
    voice_log = relationship("VoiceLog", back_populates="transactions")
