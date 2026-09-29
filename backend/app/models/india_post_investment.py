from sqlalchemy import Column, Integer, String, Numeric, ForeignKey, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class IndiaPostInvestment(Base):
    __tablename__ = "india_post_investments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    category = Column(String, default="India Post")
    scheme_name = Column(String, nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    interest_rate = Column(Numeric(5, 2), nullable=False)
    investment_date = Column(DateTime(timezone=True), nullable=False)
    maturity_date = Column(DateTime(timezone=True), nullable=False)
    frequency = Column(String, nullable=False) # One Time, Monthly
    nominee = Column(String, nullable=True)
    account_number = Column(String, nullable=True)
    branch_name = Column(String, nullable=True)
    notes = Column(String, nullable=True)
    status = Column(String, default="Active") # Active, Matured, Maturing Soon
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="india_post_investments")
