import sys
import os
import threading
import time
import concurrent.futures
import cloudscraper
from bs4 import BeautifulSoup

# Add parent directory to path to import base.py
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from base import Scraper, scraper_dict, logger

# Configure logger to output to console for backend logs
# logger.remove()
# logger.add(sys.stderr, level="INFO")

def run_scraper_thread(site: str, scraper_instance: Scraper):
    """
    Function to run a single scraper in a thread.
    Use this as the 'target' for existing Scraper.get_scraped_courses logic.
    """
    code_name = scraper_dict[site]
    try:
        # The Scraper class expects a method name matching the code_name
        method = getattr(scraper_instance, code_name)
        method()
    except Exception as e:
        logger.error(f"Error scraping {site}: {e}")

def get_all_courses():
    """
    Instantiates the Scraper and fetches courses from all configured sites.
    Returns a list of course dictionaries.
    """
    # Initialize scraper with all available sites
    sites = list(scraper_dict.keys())
    scraper = Scraper(site_to_scrape=sites, debug=True)
    
    # Run the scraping process
    # The existing Scraper.get_scraped_courses method handles threading 
    # but expects a target function to be passed that spawns the thread.
    # We provide a wrapper that actually calls the scraper method.
    
    def thread_starter(site):
        run_scraper_thread(site, scraper)

    logger.info("Starting scrape job...")
    courses = scraper.get_scraped_courses(target=thread_starter)
    
    # Enrichment
    logger.info("Enriching course data from Udemy...")
    udemy_scraper = cloudscraper.create_scraper()
    
    def enrich_course(course):
        if "udemy.com" in course.url:
            try:
                # Basic sleep to be nice
                time.sleep(1) # Simple static sleep
                
                resp = udemy_scraper.get(course.url)
                if resp.status_code == 200:
                    soup = BeautifulSoup(resp.content, "html.parser")
                    course.set_udemy_metadata(soup)
                else:
                    logger.warning(f"Failed to fetch Udemy page {course.url}: {resp.status_code}")
            except Exception as e:
                logger.error(f"Error enriching {course.url}: {e}")
        return course

    enriched_courses = []
    # Limit concurrency to 3
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
        future_to_course = {executor.submit(enrich_course, c): c for c in courses}
        for future in concurrent.futures.as_completed(future_to_course):
            try:
                enriched_courses.append(future.result())
            except Exception as e:
                logger.error(f"Enrichment task failed: {e}")

    # Convert Course objects to dicts for JSON serialization
    results = []
    for course in enriched_courses:
        results.append({
            "title": course.title,
            "url": course.url,
            "site": course.site,
            "coupon_code": course.coupon_code,
            "is_free": course.is_free,
            "price": str(course.price) if course.price else None,
            "category": getattr(course, "category", None),
            "thumbnail_url": getattr(course, "thumbnail_url", None),
            "discount_info": getattr(course, "discount_info", None),
            "expiration_date": getattr(course, "expiration_date", None),
            "rating": getattr(course, "rating", None),
            "total_reviews": getattr(course, "total_reviews", None)
        })
    
    return results

if __name__ == "__main__":
    # Test run
    data = get_all_courses()
    print(f"Found {len(data)} courses")
    if data:
        print(data[0])
