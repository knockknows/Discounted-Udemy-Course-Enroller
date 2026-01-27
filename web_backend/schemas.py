from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class CourseBase(BaseModel):
    title: str
    url: str
    site: str
    coupon_code: Optional[str] = None
    is_free: bool = False
    price: Optional[str] = None
    category: Optional[str] = None
    thumbnail_url: Optional[str] = None
    discount_info: Optional[str] = None
    expiration_date: Optional[str] = None
    rating: Optional[str] = None
    total_reviews: Optional[int] = None
    description: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class Course(CourseBase):
    id: int

    class Config:
        from_attributes = True

class CourseList(BaseModel):
    count: int
    page: int
    limit: int
    courses: List[Course]

class StatusResponse(BaseModel):
    is_running: bool
