from fastapi import FastAPI, BackgroundTasks, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.asyncio import AsyncIOScheduler
import sys
from loguru import logger
from apscheduler.schedulers.asyncio import AsyncIOScheduler
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
            conn.execute(text("ALTER TABLE courses ADD COLUMN expiration_date TIMESTAMP"))
        if 'rating' not in columns:
            logger.info("Adding 'rating' column...")
            conn.execute(text("ALTER TABLE courses ADD COLUMN rating VARCHAR"))
        if 'total_reviews' not in columns:
            logger.info("Adding 'total_reviews' column...")
            conn.execute(text("ALTER TABLE courses ADD COLUMN total_reviews INTEGER"))
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

# Initialize scheduler
scheduler = AsyncIOScheduler()

def scheduled_scrape():
    logger.info("Running scheduled scrape...")
    db = SessionLocal()
    scrape_job(db)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up...")
    scheduler.add_job(scheduled_scrape, 'interval', minutes=15)
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
        
        for course_data in results:
            # Use upsert logic (Requires Postgres)
            # For simplicity with SQLAlchemy ORM generic plain: check exists then update
            existing = db.query(models.Course).filter(models.Course.url == course_data["url"]).first()
            if existing:
                existing.title = course_data["title"]
                existing.site = course_data["site"]
                existing.coupon_code = course_data["coupon_code"]
                existing.is_free = course_data["is_free"]
                existing.price = course_data["price"]
                existing.price = course_data["price"]
                
                # Update new fields
                existing.category = course_data.get("category")
                existing.thumbnail_url = course_data.get("thumbnail_url")
                existing.discount_info = course_data.get("discount_info")
                existing.expiration_date = course_data.get("expiration_date")
                existing.rating = course_data.get("rating")
                existing.total_reviews = course_data.get("total_reviews")
                
                # updated_at handled by onupdate
            else:
                new_course = models.Course(**course_data)
                db.add(new_course)
        
        db.commit()
        logger.info("Database updated.")
    except Exception as e:
        logger.error(f"Scrape failed: {e}")
        db.rollback()
    finally:
        db.close()

@app.get("/")
def read_root():
    return {"message": "Welcome to Discounted Udemy Courses API", "endpoints": ["/courses", "/scrape"]}

@app.get("/courses")
def read_courses(page: int = 1, limit: int = 20, db: Session = Depends(get_db)):
    offset = (page - 1) * limit
    total_count = db.query(models.Course).count()
    courses = db.query(models.Course).order_by(models.Course.created_at.desc()).offset(offset).limit(limit).all()
    
    return {
        "count": total_count,
        "page": page,
        "limit": limit,
        "courses": courses
    }

@app.post("/scrape")
def trigger_scrape(background_tasks: BackgroundTasks):
    # Use SessionLocal() to create a dedicated session for the background task
    # avoiding dependency injection context issues
    db = SessionLocal()
    background_tasks.add_task(scrape_job, db)
    return {"message": "Scraping started in background"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
