from sqlalchemy import Column, Integer, String, Numeric, ForeignKey, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class InvestmentTransaction(Base):
    __tablename__ = "investment_transactions"

    id = Column(Integer, primary_key=True, index=True)
    investment_id = Column(Integer, ForeignKey("investments.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    transaction_type = Column(String, nullable=False) # BUY, SELL, DIVIDEND
    units = Column(Numeric(14, 4), nullable=False)
    price_per_unit = Column(Numeric(14, 4), nullable=False)
    total_amount = Column(Numeric(14, 2), nullable=False)
    transaction_date = Column(DateTime(timezone=True), server_default=func.now())
    notes = Column(String, nullable=True)

    investment = relationship("Investment", back_populates="investment_transactions")
    user = relationship("User", back_populates="investment_transactions")
