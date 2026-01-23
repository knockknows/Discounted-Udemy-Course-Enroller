from fastapi import FastAPI, BackgroundTasks, Depends
from typing import List, Optional
import uvicorn
from contextlib import asynccontextmanager
from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import insert
import models
from database import engine, get_db
from scraper_wrapper import get_all_courses

# Create tables
models.Base.metadata.create_all(bind=engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Starting up...")
    yield
    print("Shutting down...")

app = FastAPI(title="Discounted Udemy Courses API", lifespan=lifespan)

def scrape_job(db: Session):
    print("Starting background scrape...")
    try:
        results = get_all_courses()
        print(f"Scrape complete. Found {len(results)} courses. Saving to DB...")
        
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
        print("Database updated.")
    except Exception as e:
        print(f"Scrape failed: {e}")
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
