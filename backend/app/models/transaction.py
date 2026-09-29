from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean, Numeric
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    account_id = Column(Integer, ForeignKey("accounts.id", ondelete="SET NULL"), nullable=True, index=True)
    amount = Column(Numeric(12, 2), nullable=False)
    date = Column(DateTime(timezone=True), default=func.now(), nullable=False, index=True)
    description = Column(String, nullable=True)
    category_id = Column(Integer, ForeignKey("categories.id", ondelete="SET NULL"), nullable=True, index=True)
    merchant_id = Column(Integer, ForeignKey("merchants.id", ondelete="SET NULL"), nullable=True, index=True)
    payment_method = Column(String, default="Cash")  # Cash, Credit Card, Debit Card, UPI, Net Banking
    type = Column(String, default="expense")  # expense, income, transfer
    is_recurring = Column(Boolean, default=False)
    receipt_id = Column(Integer, ForeignKey("receipts.id", ondelete="SET NULL"), nullable=True, index=True)
    voice_log_id = Column(Integer, ForeignKey("voice_logs.id", ondelete="SET NULL"), nullable=True, index=True)
    transfer_id = Column(Integer, ForeignKey("transfers.id", ondelete="SET NULL"), nullable=True, index=True)
    fingerprint = Column(String(64), nullable=True, index=True)  # SHA-256 duplicate fingerprint
    tags = Column(String, nullable=True)  # Comma-separated tags e.g., "vacation,dinner"
    import_batch_id = Column(String, ForeignKey("import_batches.id", ondelete="SET NULL"), nullable=True, index=True)
    transaction_id = Column(String, nullable=True, index=True)
    reference_number = Column(String, nullable=True, index=True)
    bank = Column(String, nullable=True)
    balance = Column(Numeric(14, 2), nullable=True)
    debit_amount = Column(Numeric(12, 2), nullable=True)
    credit_amount = Column(Numeric(12, 2), nullable=True)
    post_date = Column(String, nullable=True)
    time = Column(String, nullable=True)
    subcategory = Column(String, nullable=True, default="Uncategorized")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="transactions")
    account = relationship("Account", back_populates="transactions")
    category = relationship("Category", back_populates="transactions")
    merchant = relationship("Merchant", back_populates="transactions")
    receipt = relationship("Receipt", back_populates="transactions")
    voice_log = relationship("VoiceLog", back_populates="transactions")
    import_batch = relationship("ImportBatch", foreign_keys=[import_batch_id])
