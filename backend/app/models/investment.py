from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Numeric
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class Investment(Base):
    __tablename__ = "investments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    asset_name = Column(String, nullable=False)  # e.g., AAPL, Bitcoin, HDFC Mutual Fund
    asset_type = Column(String, nullable=False)  # Stock, Crypto, Mutual Fund, Gold, Real Estate
    symbol = Column(String, nullable=True)  # e.g. AAPL, RELIANCE.NS, BTC-USD
    exchange = Column(String, nullable=True)  # e.g. NASDAQ, NSE, BSE, Crypto
    quantity = Column(Numeric(14, 4), nullable=False)
    purchase_price = Column(Numeric(14, 4), nullable=False)
    current_price = Column(Numeric(14, 4), nullable=False)
    previous_close = Column(Numeric(14, 4), nullable=True, default=0.0)
    price_last_updated = Column(DateTime(timezone=True), nullable=True)
    purchase_date = Column(DateTime(timezone=True), nullable=True)
    dividends_received = Column(Numeric(14, 2), default=0.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="investments")
    investment_transactions = relationship("InvestmentTransaction", back_populates="investment", cascade="all, delete-orphan")
