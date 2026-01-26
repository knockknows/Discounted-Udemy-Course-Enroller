import sys
import os
import threading
import time

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
    
    # Convert Course objects to dicts for JSON serialization
    results = []
    for course in courses:
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
            "expiration_date": getattr(course, "expiration_date", None)
        })
    
    return results

if __name__ == "__main__":
    # Test run
    data = get_all_courses()
    print(f"Found {len(data)} courses")
    if data:
        print(data[0])
