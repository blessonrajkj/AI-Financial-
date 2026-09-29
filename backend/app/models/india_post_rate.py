from sqlalchemy import Column, Integer, String, Numeric, Date, DateTime
from sqlalchemy.sql import func
from app.core.database import Base

class IndiaPostRate(Base):
    __tablename__ = "india_post_rates"

    id = Column(Integer, primary_key=True, index=True)
    scheme_code = Column(String, nullable=False, index=True) # PPF, NSC, KVP, SSY, SCSS, MIS, POTD, PORD
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    annual_rate = Column(Numeric(5, 2), nullable=False)
    compounding_frequency = Column(String, nullable=False, default="Annual") # Annual, Quarterly, Monthly
    created_at = Column(DateTime(timezone=True), server_default=func.now())
