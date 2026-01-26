from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, UniqueConstraint
from database import Base
from datetime import datetime

class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    url = Column(String, unique=True, index=True)
    site = Column(String, index=True)
    coupon_code = Column(String, nullable=True)
    is_free = Column(Boolean, default=False)
    price = Column(String, nullable=True)
    
    # New Fields
    category = Column(String, nullable=True, index=True)
    thumbnail_url = Column(String, nullable=True)
    discount_info = Column(String, nullable=True)
    expiration_date = Column(DateTime, nullable=True)
    rating = Column(String, nullable=True) # Storing as string to keep it simple or Float
    total_reviews = Column(Integer, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Constraint to ensure unique course listings if we ever treat URL differently
    # __table_args__ = (UniqueConstraint('url', name='_course_url_uc'),)
