from sqlalchemy import Column, Integer, String, Float, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.core.database import Base

class UserProfile(Base):
    __tablename__ = "user_profiles"

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    username = Column(String, unique=True, index=True, nullable=True)
    phone_number = Column(String, nullable=True)
    date_of_birth = Column(String, nullable=True)
    gender = Column(String, nullable=True)
    occupation = Column(String, nullable=True)
    annual_income = Column(Float, nullable=True, default=0.0)
    address = Column(String, nullable=True)
    city = Column(String, nullable=True)
    state = Column(String, nullable=True)
    country = Column(String, nullable=True)
    pin_code = Column(String, nullable=True)
    preferred_currency = Column(String, default="INR")
    preferred_language = Column(String, default="English")
    time_zone = Column(String, default="Asia/Kolkata")

    # Relationship
    user = relationship("User", back_populates="profile")

class LinkedBank(Base):
    __tablename__ = "linked_banks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    bank_name = Column(String, nullable=False)
    account_holder = Column(String, nullable=False)
    account_number = Column(String, nullable=False)
    ifsc_code = Column(String, nullable=False)
    branch = Column(String, nullable=True)
    account_type = Column(String, default="Savings")  # Savings, Current, Salary, Joint
    nickname = Column(String, nullable=True)
    is_primary = Column(Boolean, default=False)

    # Relationship
    user = relationship("User", back_populates="linked_banks")

class UserSettings(Base):
    __tablename__ = "user_settings"

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    push_notifications = Column(Boolean, default=True)
    email_notifications = Column(Boolean, default=True)
    sms_notifications = Column(Boolean, default=True)
    bill_reminders = Column(Boolean, default=True)
    investment_alerts = Column(Boolean, default=True)
    budget_alerts = Column(Boolean, default=True)
    subscription_alerts = Column(Boolean, default=True)
    salary_credit_alerts = Column(Boolean, default=True)
    two_factor_enabled = Column(Boolean, default=False)
    two_factor_method = Column(String, default="App")  # App, SMS
    privacy_mode = Column(Boolean, default=False)
    theme = Column(String, default="dark")

    # Relationship
    user = relationship("User", back_populates="settings")
