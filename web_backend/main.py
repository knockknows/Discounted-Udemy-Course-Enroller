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
from scraper_wrapper import get_all_courses

# Create tables
models.Base.metadata.create_all(bind=engine)

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
def read_courses(limit: int = 100, db: Session = Depends(get_db)):
    courses = db.query(models.Course).order_by(models.Course.created_at.desc()).limit(limit).all()
    # Convert to list of dicts or rely on FastAPI response model, manual for now
    return {
        "count": len(courses),
        "courses": courses
    }

@app.post("/scrape")
def trigger_scrape(background_tasks: BackgroundTasks):
    # We need a new session for the background task
    db = next(get_db()) 
    background_tasks.add_task(scrape_job, db)
    return {"message": "Scraping started in background"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
