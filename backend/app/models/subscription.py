from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)  # e.g., Netflix, Spotify
    amount = Column(Float, nullable=False)
    billing_cycle = Column(String, default="monthly")  # monthly, yearly
    next_billing_date = Column(DateTime(timezone=True), nullable=False)
    is_active = Column(Boolean, default=True)
    is_autopay = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="subscriptions")
