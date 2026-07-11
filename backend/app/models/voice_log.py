from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class VoiceLog(Base):
    __tablename__ = "voice_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    transcript = Column(String, nullable=False)
    parsed_json = Column(String, nullable=True)  # Store JSON representation of extracted data
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="voice_logs")
    transactions = relationship("Transaction", back_populates="voice_log")
