from fastapi import FastAPI, BackgroundTasks, Depends, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timedelta
from apscheduler.schedulers.asyncio import AsyncIOScheduler
import sys
import os
from loguru import logger

# Add parent directory to path to import base.py
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from base import RedisSink
from typing import List, Optional
import uvicorn
from contextlib import asynccontextmanager
from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import insert
import models
from database import engine, get_db, SessionLocal
from database import engine, get_db, SessionLocal
from scraper_wrapper import get_all_courses
from sqlalchemy import text, inspect
import redis
import os
import json

def ensure_schema_updates():
    """Check for missing columns and add them if necessary."""
    logger.info("Checking database schema...")
    inspector = inspect(engine)
    columns = [col['name'] for col in inspector.get_columns('courses')]
    
    with engine.connect() as conn:
        if 'category' not in columns:
            logger.info("Adding 'category' column...")
            conn.execute(text("ALTER TABLE courses ADD COLUMN category VARCHAR"))
        if 'thumbnail_url' not in columns:
            logger.info("Adding 'thumbnail_url' column...")
            conn.execute(text("ALTER TABLE courses ADD COLUMN thumbnail_url VARCHAR"))
        if 'discount_info' not in columns:
            logger.info("Adding 'discount_info' column...")
            conn.execute(text("ALTER TABLE courses ADD COLUMN discount_info VARCHAR"))
        if 'expiration_date' not in columns:
            logger.info("Adding 'expiration_date' column...")
            conn.execute(text("ALTER TABLE courses ADD COLUMN expiration_date VARCHAR"))
        else:
            # Ensure it is VARCHAR
            try:
                conn.execute(text("ALTER TABLE courses ALTER COLUMN expiration_date TYPE VARCHAR"))
            except Exception as e:
                logger.warning(f"Could not alter expiration_date type: {e}")
        if 'rating' not in columns:
            logger.info("Adding 'rating' column...")
            conn.execute(text("ALTER TABLE courses ADD COLUMN rating VARCHAR"))
        if 'total_reviews' not in columns:
            logger.info("Adding 'total_reviews' column...")
            conn.execute(text("ALTER TABLE courses ADD COLUMN total_reviews INTEGER"))
        if 'description' not in columns:
            logger.info("Adding 'description' column...")
            conn.execute(text("ALTER TABLE courses ADD COLUMN description TEXT"))
            
        if 'is_subscribed' not in columns:
            logger.info("Adding 'is_subscribed' column...")
            conn.execute(text("ALTER TABLE courses ADD COLUMN is_subscribed BOOLEAN DEFAULT FALSE"))
        
        # Data Migration: Fix existing courses that were marked as paid (is_free=False) 
        # but have a coupon code (which implies they are free/discounted).
        logger.info("Migrating data: Setting is_free=True for courses with coupon_code...")
        conn.execute(text("UPDATE courses SET is_free = true WHERE coupon_code IS NOT NULL AND is_free = false"))
        
        conn.commit()
    logger.info("Schema check complete.")

# Create tables
# Create tables
models.Base.metadata.create_all(bind=engine)
# Run schema updates (for existing installs)
try:
    ensure_schema_updates()
except Exception as e:
    logger.error(f"Schema update failed: {e}")

# Init logger
logger.remove()
logger.add(sys.stderr, format="{time} {level} {message}", level="INFO", serialize=True)
try:
    logger.add(RedisSink(), level="INFO", format="{time} {level} {message}")
except Exception as e:
    logger.error(f"Failed to add Redis Sink: {e}")

# Initialize scheduler
scheduler = AsyncIOScheduler()

def scheduled_scrape():
    logger.info("Running scheduled scrape...")
    db = SessionLocal()
    scrape_job(db)

def clean_old_courses():
    logger.info("Running scheduled old courses cleanup...")
    db = SessionLocal()
    try:
        two_weeks_ago = datetime.utcnow() - timedelta(days=14)
        deleted_count = db.query(models.Course).filter(models.Course.created_at < two_weeks_ago).delete()
        if deleted_count > 0:
            logger.info(f"Cleaned up {deleted_count} courses older than two weeks.")
        db.commit()
    except Exception as e:
        logger.error(f"Cleanup failed: {e}")
        db.rollback()
    finally:
        db.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up...")
    # Run cleanup on startup once
    clean_old_courses()
    
    scheduler.add_job(scheduled_scrape, 'interval', minutes=15)
    # Run cleanup once a day at midnight
    scheduler.add_job(clean_old_courses, 'cron', hour=0, minute=0)
    scheduler.start()
    logger.info("Scheduler started.")
    yield
    logger.info("Shutting down...")
    scheduler.shutdown()

app = FastAPI(title="Discounted Udemy Courses API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info(f"Incoming request: {request.method} {request.url} from {request.client.host}")
    response = await call_next(request)
    logger.info(f"Response status: {response.status_code}")
    return response

def scrape_job(db: Session):
    logger.info("Starting background scrape...")
    try:
        results = get_all_courses()
        logger.info(f"Scrape complete. Found {len(results)} courses. Saving to DB...")
        
        count_new = 0
        count_updated = 0
        
        for course_data in results:
            # logger.info(f"Processing: {course_data.get('title')} | {course_data.get('url')}")
            # Use upsert logic (Requires Postgres)
            # For simplicity with SQLAlchemy ORM generic plain: check exists then update
            existing = db.query(models.Course).filter(
                (models.Course.url == course_data["url"]) | (models.Course.title == course_data["title"])
            ).first()
            if existing:
                existing.title = course_data["title"]
                existing.site = course_data["site"]
                existing.coupon_code = course_data["coupon_code"]
                existing.is_free = course_data["is_free"]
                existing.price = course_data["price"]
                
                # Update new fields
                existing.category = course_data.get("category")
                existing.thumbnail_url = course_data.get("thumbnail_url")
                existing.discount_info = course_data.get("discount_info")
                existing.expiration_date = course_data.get("expiration_date")
                existing.rating = course_data.get("rating")
                existing.total_reviews = course_data.get("total_reviews")
                existing.description = course_data.get("description")
                
                count_updated += 1
                # updated_at handled by onupdate
            else:
                new_course = models.Course(**course_data)
                db.add(new_course)
                count_new += 1
        
        logger.info(f"Committing to DB... New: {count_new}, Updated: {count_updated}")
        db.commit()
        logger.info("Database commit successful.")
    except Exception as e:
        logger.error(f"Scrape failed: {e}")
        db.rollback()
    finally:
        db.close()

@app.get("/")
def read_root():
    return {"message": "Welcome to Discounted Udemy Courses API", "endpoints": ["/courses", "/scrape"]}

import schemas

# ... (existing imports)

# ... inside read_courses

@app.get("/courses", response_model=schemas.CourseList)
def read_courses(
    page: int = 1, 
    limit: int = 20, 
    search: Optional[str] = None,
    category: Optional[str] = None,
    show_free_only: bool = False,
    is_subscribed: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.Course)

    if search:
        query = query.filter(models.Course.title.ilike(f"%{search}%"))
    
    if category and category != "All":
        query = query.filter(models.Course.category == category)
        
    if show_free_only:
        query = query.filter(models.Course.is_free == True)

    if is_subscribed is not None:
        query = query.filter(models.Course.is_subscribed == is_subscribed)

    total_count = query.count()
    logger.info(f"API /courses: search='{search}', category='{category}', free={show_free_only} -> Found {total_count} records")
    
    offset = (page - 1) * limit
    courses = query.order_by(models.Course.created_at.desc(), models.Course.id.desc()).offset(offset).limit(limit).all()
    
    return schemas.CourseList(
        count=total_count,
        page=page,
        limit=limit,
        courses=courses
    )

@app.put("/courses/{course_id}/subscribe", response_model=schemas.Course)
def toggle_subscribe(course_id: int, db: Session = Depends(get_db)):
    course = db.query(models.Course).filter(models.Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    course.is_subscribed = not course.is_subscribed
    db.commit()
    db.refresh(course)
    return course

@app.post("/scrape")
def trigger_scrape(background_tasks: BackgroundTasks):
    # Use SessionLocal() to create a dedicated session for the background task
    # avoiding dependency injection context issues
    db = SessionLocal()
    background_tasks.add_task(scrape_job, db)
    return {"message": "Scraping started in background"}


@app.get("/admin/logs")
def get_logs(limit: int = 100):
    """Fetch recent logs from Redis."""
    redis_url = os.getenv("REDIS_URL", "redis://redis:6379/0")
    try:
        r = redis.from_url(redis_url, socket_connect_timeout=1)
        # lrange returns list of bytes
        logs = r.lrange("log_channel", -limit, -1)
        return {"logs": [l.decode("utf-8") for l in logs]}
    except Exception as e:
        logger.error(f"Failed to fetch logs: {e}")
        return {"logs": [], "error": str(e)}

@app.get("/admin/status")
def get_status():
    """Check if scraper is running."""
    redis_url = os.getenv("REDIS_URL", "redis://redis:6379/0")
    try:
        r = redis.from_url(redis_url, socket_connect_timeout=1)
        # Check if lock key exists. Key name is "scraper_lock" (from base.py)
        # Note: redis lock implementation details vary. 
        # But usually the key is present.
        is_running = r.exists("scraper_lock") == 1
        return {"is_running": is_running}
    except Exception as e:
        return {"is_running": False, "error": str(e)}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
