import concurrent.futures
import os
import re
import sys
import time
from datetime import datetime
from decimal import Decimal, InvalidOperation
from typing import Any, Optional
from urllib.parse import quote_plus

import cloudscraper
from bs4 import BeautifulSoup

# Add parent directory to path to import base.py
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from base import Scraper, logger, scraper_dict

VERIFIED_100 = "verified_100"
VERIFIED_NOT_100 = "verified_not_100"
UNVERIFIED_ERROR = "unverified_error"

APPLIED_STATUSES = {"applied", "best_price", "already_applied"}
FAILED_STATUSES = {
    "invalid",
    "expired",
    "not_applied",
    "failed",
    "blocked",
    "rejected",
    "not_eligible",
}


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


def _to_int(value: Any) -> Optional[int]:
    if value is None:
        return None
    if isinstance(value, bool):
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        text = str(value)
        match = re.search(r"-?\d+", text)
        if not match:
            return None
        try:
            return int(match.group(0))
        except ValueError:
            return None


def _to_decimal(value: Any) -> Optional[Decimal]:
    if value is None:
        return None
    if isinstance(value, Decimal):
        return value
    if isinstance(value, (int, float)):
        try:
            return Decimal(str(value))
        except InvalidOperation:
            return None

    text = str(value).strip()
    if not text:
        return None

    cleaned = re.sub(r"[^0-9.\-]", "", text)
    if cleaned in {"", ".", "-", "-."}:
        return None

    try:
        return Decimal(cleaned)
    except InvalidOperation:
        return None


def _decimal_to_string(value: Optional[Decimal]) -> Optional[str]:
    if value is None:
        return None
    normalized = value.normalize()
    # Avoid scientific notation in DB/API payloads
    text = format(normalized, "f")
    if "." in text:
        text = text.rstrip("0").rstrip(".")
    return text or "0"


def _extract_course_id(soup: BeautifulSoup, html: str) -> Optional[str]:
    body = soup.find("body")
    if body:
        course_id = body.get("data-clp-course-id")
        if course_id and str(course_id).isdigit():
            return str(course_id)

    pattern_candidates = [
        r'data-clp-course-id="(\d+)"',
        r'"courseId"\s*:\s*(\d+)',
        r'"id"\s*:\s*(\d+)\s*,\s*"_class"\s*:\s*"course"',
    ]
    for pattern in pattern_candidates:
        match = re.search(pattern, html)
        if match:
            return match.group(1)
    return None


def _build_verification_result(
    status: str,
    discount_percent: Optional[int],
    final_price: Optional[Decimal],
    source: str,
    error: Optional[str] = None,
) -> dict:
    return {
        "verification_status": status,
        "verified_discount_percent": discount_percent,
        "verified_final_price": _decimal_to_string(final_price),
        "verification_source": source,
        "verification_checked_at": datetime.utcnow(),
        "verification_error": error,
        "is_free": status == VERIFIED_100,
    }


def _evaluate_verification(
    coupon_code: Optional[str],
    discount_percent: Optional[int],
    final_price: Optional[Decimal],
    coupon_status: Optional[str],
    source: str,
    default_error: Optional[str],
) -> dict:
    normalized_status = coupon_status.lower() if isinstance(coupon_status, str) else None

    if coupon_code and normalized_status in FAILED_STATUSES:
        return _build_verification_result(
            VERIFIED_NOT_100,
            discount_percent,
            final_price,
            source,
            error=f"Coupon status: {normalized_status}",
        )

    if final_price is not None:
        if final_price == Decimal("0"):
            if coupon_code:
                if normalized_status in APPLIED_STATUSES or normalized_status is None or discount_percent == 100:
                    return _build_verification_result(VERIFIED_100, discount_percent, final_price, source)
            else:
                return _build_verification_result(VERIFIED_100, discount_percent, final_price, source)
        elif final_price > Decimal("0"):
            return _build_verification_result(VERIFIED_NOT_100, discount_percent, final_price, source)

    if discount_percent is not None:
        if discount_percent == 100:
            if not coupon_code or normalized_status in APPLIED_STATUSES or normalized_status is None:
                return _build_verification_result(VERIFIED_100, discount_percent, final_price, source)
        elif discount_percent < 100:
            return _build_verification_result(VERIFIED_NOT_100, discount_percent, final_price, source)

    return _build_verification_result(
        UNVERIFIED_ERROR,
        discount_percent,
        final_price,
        source,
        error=default_error or "Unable to determine effective 100% discount",
    )


def _verify_with_api(
    udemy_scraper: Any,
    course_id: str,
    coupon_code: Optional[str],
) -> dict:
    components = "purchase,redeem_coupon" if coupon_code else "purchase"
    url = (
        f"https://www.udemy.com/api-2.0/course-landing-components/{course_id}/me/"
        f"?components={components}"
    )
    if coupon_code:
        url += f"&couponCode={quote_plus(coupon_code)}"

    try:
        response = udemy_scraper.get(url, timeout=15)
    except Exception as e:
        return _build_verification_result(
            UNVERIFIED_ERROR,
            None,
            None,
            "api",
            error=f"Udemy API request failed: {e}",
        )

    if response.status_code != 200:
        return _build_verification_result(
            UNVERIFIED_ERROR,
            None,
            None,
            "api",
            error=f"Udemy API returned HTTP {response.status_code}",
        )

    try:
        payload = response.json()
    except Exception as e:
        return _build_verification_result(
            UNVERIFIED_ERROR,
            None,
            None,
            "api",
            error=f"Udemy API JSON parse failed: {e}",
        )

    purchase_data = payload.get("purchase", {}).get("data", {})
    pricing_result = purchase_data.get("pricing_result", {})

    discount_percent = _to_int(pricing_result.get("discount_percent"))

    final_price = None
    final_price_candidates = [
        pricing_result.get("price", {}).get("amount") if isinstance(pricing_result.get("price"), dict) else None,
        pricing_result.get("discount_price", {}).get("amount") if isinstance(pricing_result.get("discount_price"), dict) else None,
        pricing_result.get("discounted_price", {}).get("amount") if isinstance(pricing_result.get("discounted_price"), dict) else None,
        purchase_data.get("price", {}).get("amount") if isinstance(purchase_data.get("price"), dict) else None,
        purchase_data.get("discounted_price", {}).get("amount") if isinstance(purchase_data.get("discounted_price"), dict) else None,
    ]
    for candidate in final_price_candidates:
        decimal_candidate = _to_decimal(candidate)
        if decimal_candidate is not None:
            final_price = decimal_candidate
            break

    list_price = _to_decimal(
        purchase_data.get("list_price", {}).get("amount")
        if isinstance(purchase_data.get("list_price"), dict)
        else None
    )

    if discount_percent is None and list_price and final_price is not None and list_price > Decimal("0"):
        calculated = (list_price - final_price) / list_price * Decimal("100")
        discount_percent = max(0, min(100, int(round(float(calculated)))))

    coupon_status = None
    redeem_coupon = payload.get("redeem_coupon")
    if isinstance(redeem_coupon, dict):
        attempts = redeem_coupon.get("discount_attempts")
        if isinstance(attempts, list) and attempts and isinstance(attempts[0], dict):
            coupon_status = attempts[0].get("status")

    return _evaluate_verification(
        coupon_code,
        discount_percent,
        final_price,
        coupon_status,
        source="api",
        default_error="Udemy API response missing pricing confirmation",
    )


def _verify_with_html(course, html: str, soup: BeautifulSoup) -> dict:
    discount_percent = None
    final_price = None
    coupon_status = None

    for pattern in [r'"discount_percent"\s*:\s*(\d{1,3})', r"(\d{1,3})\s*%\s*off"]:
        match = re.search(pattern, html, flags=re.IGNORECASE)
        if match:
            parsed = _to_int(match.group(1))
            if parsed is not None:
                discount_percent = max(0, min(100, parsed))
                break

    for pattern in [
        r'"discounted_price"\s*:\s*\{[^\}]*"amount"\s*:\s*"?([0-9]+(?:\.[0-9]+)?)"?',
        r'"discount_price"\s*:\s*\{[^\}]*"amount"\s*:\s*"?([0-9]+(?:\.[0-9]+)?)"?',
        r'"current_price"\s*:\s*\{[^\}]*"amount"\s*:\s*"?([0-9]+(?:\.[0-9]+)?)"?',
        r'"price"\s*:\s*\{[^\}]*"amount"\s*:\s*"?([0-9]+(?:\.[0-9]+)?)"?',
    ]:
        match = re.search(pattern, html)
        if match:
            final_price = _to_decimal(match.group(1))
            if final_price is not None:
                break

    if final_price is None:
        meta_price = soup.find("meta", attrs={"property": "product:price:amount"})
        if meta_price and meta_price.get("content"):
            final_price = _to_decimal(meta_price["content"])

    if final_price is None and re.search(r">\s*Free\s*<", html, flags=re.IGNORECASE):
        final_price = Decimal("0")

    coupon_match = re.search(
        r'"discount_attempts"\s*:\s*\[\s*\{[^\}]*"status"\s*:\s*"([^\"]+)"',
        html,
    )
    if coupon_match:
        coupon_status = coupon_match.group(1)

    return _evaluate_verification(
        course.coupon_code,
        discount_percent,
        final_price,
        coupon_status,
        source="html",
        default_error="HTML fallback could not confirm 100% discount",
    )


def verify_udemy_discount(
    course,
    udemy_scraper: Any,
    html: str,
    soup: BeautifulSoup,
) -> dict:
    course_id = _extract_course_id(soup, html)
    api_error = None

    if course_id:
        api_result = _verify_with_api(udemy_scraper, course_id, course.coupon_code)
        if api_result["verification_status"] != UNVERIFIED_ERROR:
            return api_result
        api_error = api_result.get("verification_error")

    html_result = _verify_with_html(course, html, soup)
    if html_result["verification_status"] != UNVERIFIED_ERROR:
        html_result["verification_source"] = "api+html" if course_id else "html"
        return html_result

    joined_error = " | ".join(filter(None, [api_error, html_result.get("verification_error")]))
    return _build_verification_result(
        UNVERIFIED_ERROR,
        html_result.get("verified_discount_percent"),
        _to_decimal(html_result.get("verified_final_price")),
        source="api+html" if course_id else "html",
        error=joined_error or "Verification failed via API and HTML fallback",
    )


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
    # Use desktop chrome emulation to avoid 403
    udemy_scraper = cloudscraper.create_scraper(
        browser={
            "browser": "chrome",
            "platform": "windows",
            "desktop": True,
        }
    )

    def enrich_course(course):
        verification_result = _build_verification_result(
            UNVERIFIED_ERROR,
            None,
            None,
            source="none",
            error="Verification skipped: non-Udemy URL",
        )

        if "udemy.com" in course.url:
            try:
                # Basic sleep to avoid aggressive request burst
                time.sleep(1)

                response = udemy_scraper.get(course.url, timeout=20)
                if response.status_code == 200:
                    soup = BeautifulSoup(response.content, "html.parser")
                    course.set_udemy_metadata(soup)
                    verification_result = verify_udemy_discount(course, udemy_scraper, response.text, soup)
                else:
                    verification_result = _build_verification_result(
                        UNVERIFIED_ERROR,
                        None,
                        None,
                        source="html",
                        error=f"Udemy page fetch failed with HTTP {response.status_code}",
                    )
            except Exception as e:
                logger.error(f"Error enriching {course.url}: {e}")
                verification_result = _build_verification_result(
                    UNVERIFIED_ERROR,
                    None,
                    None,
                    source="html",
                    error=f"Udemy enrichment error: {e}",
                )

        return course, verification_result

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
    for course, verification in enriched_courses:
        fallback_price = _to_decimal(course.price)
        verified_price = _to_decimal(verification.get("verified_final_price"))
        stored_price = verified_price if verified_price is not None else fallback_price

        verified_discount_percent = verification.get("verified_discount_percent")
        discount_info = getattr(course, "discount_info", None)
        if verified_discount_percent is not None:
            discount_info = f"{verified_discount_percent}% OFF"

        results.append(
            {
                "title": course.title,
                "url": course.url,
                "site": course.site,
                "coupon_code": course.coupon_code,
                "is_free": verification.get("verification_status") == VERIFIED_100,
                "price": _decimal_to_string(stored_price),
                "category": getattr(course, "category", None),
                "thumbnail_url": getattr(course, "thumbnail_url", None),
                "discount_info": discount_info,
                "expiration_date": getattr(course, "expiration_date", None),
                "rating": getattr(course, "rating", None),
                "total_reviews": getattr(course, "total_reviews", None),
                "description": getattr(course, "description", None),
                "verification_status": verification.get("verification_status", UNVERIFIED_ERROR),
                "verified_discount_percent": verification.get("verified_discount_percent"),
                "verified_final_price": verification.get("verified_final_price"),
                "verification_source": verification.get("verification_source"),
                "verification_checked_at": verification.get("verification_checked_at"),
                "verification_error": verification.get("verification_error"),
            }
        )

    logger.info(f"Enrichment complete. Total courses in results: {len(results)}")
    return results


if __name__ == "__main__":
    # Test run
    data = get_all_courses()
    print(f"Found {len(data)} courses")
    if data:
        print(data[0])
