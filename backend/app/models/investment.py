from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class Investment(Base):
    __tablename__ = "investments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    asset_name = Column(String, nullable=False)  # e.g., AAPL, Bitcoin, HDFC Mutual Fund
    asset_type = Column(String, nullable=False)  # Stock, Crypto, Mutual Fund, Gold, Real Estate
    quantity = Column(Float, nullable=False)
    purchase_price = Column(Float, nullable=False)
    current_price = Column(Float, nullable=False)
    purchase_date = Column(DateTime(timezone=True), nullable=True)
    dividends_received = Column(Float, default=0.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="investments")
