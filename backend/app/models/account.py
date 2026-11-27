from sqlalchemy import Column, Integer, String, Numeric, ForeignKey, DateTime, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class Account(Base):
    __tablename__ = "accounts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    account_name = Column(String, nullable=False)
    account_number_mask = Column(String, nullable=True)
    bank_name = Column(String, nullable=False)
    account_type = Column(String, nullable=False, default="Savings")
    balance = Column(Numeric(14, 2), nullable=False, default=0.00)
    currency = Column(String, default="INR")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    user = relationship("User", back_populates="accounts")
    transactions = relationship("Transaction", back_populates="account")
    source_transfers = relationship("Transfer", foreign_keys="Transfer.source_account_id", back_populates="source_account")
    destination_transfers = relationship("Transfer", foreign_keys="Transfer.destination_account_id", back_populates="destination_account")
