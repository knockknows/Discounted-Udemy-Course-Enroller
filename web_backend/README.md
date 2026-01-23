# Discounted Udemy Courses - Web Backend Prototype

This is the prototype backend for the web-based version of the Discounted Udemy Course Enroller.

## Setup

1.  Navigate to the project root.
2.  Install dependencies:
    ```bash
    pip install -r web_backend/requirements.txt
    ```

## Running the API

1.  Run the FastAPI server:
    ```bash
    python3 web_backend/main.py
    ```
2.  Open your browser to [http://localhost:8000/docs](http://localhost:8000/docs) to see the API documentation.

## Endpoints

-   `GET /`: Health check.
-   `POST /scrape`: Triggers a background scraping job. **Note:** This takes a few minutes to complete as it scrapes multiple sites.
-   `GET /courses`: Returns the list of cached courses found by the scraper.

## Architecture

-   `main.py`: FastAPI application.
-   `scraper_wrapper.py`: Adapts the `base.Scraper` class from the root directory to run in a backend environment.
