# Discounted Udemy Course Enroller - Web Platform

## Overview
The **Discounted Udemy Course Enroller** (Web Platform) is a full-stack application designed to aggregate, store, and display free Udemy coupons from various sources. It automates the process of finding free courses, enriching them with metadata, and presenting them in a modern web interface.

## Architecture & Operation Flow

The application follows a microservices-based architecture orchestrated via Docker Compose.

```mermaid
graph TD
    subgraph "External Sources"
        Sites["Coupon Sites (Real Discount, etc.)"]
        Udemy["Udemy.com (Metadata)"]
    end

    subgraph "Backend Services"
        Scheduler[APScheduler (15m Interval)]
        API[FastAPI Server]
        Scraper[Scraper Logic (base.py)]
        Enricher[Metadata Enricher]
    end

    subgraph "Data Persistence"
        DB[(PostgreSQL)]
        Redis[(Redis Cache/Logs)]
    end

    subgraph "Frontend"
        NextJS[Next.js Client]
        Browser[User Browser]
    end

    Scheduler -->|Triggers| Scraper
    API -->|Manual Trigger| Scraper
    Scraper -->|Raw Links| Sites
    Scraper -->|Course Objects| Enricher
    Enricher -->|Course Details| Udemy
    Enricher -->|Upsert| DB
    
    Browser -->|View Courses| NextJS
    NextJS -->|Fetch JSON| API
    API -->|Query| DB
    API -->|Read Logs| Redis
```

### 1. Data Collection Flow
1.  **Trigger**: The scraping process is triggered either automatically (every 15 minutes by `APScheduler`) or manually via the `/scrape` API endpoint.
2.  **Scraping**: The `Scraper` class (in `base.py`) iterates through configured sites (Real Discount, Courson, etc.) to find course links.
    *   It uses `requests` and `BeautifulSoup` to parse HTML.
    *   It normalizes URLs and extracts coupon codes.
3.  **Enrichment**: The `scraper_wrapper.py` logic takes the raw scraped links and fetches additional metadata from Udemy (thumbnail, rating, description) using `cloudscraper`.
4.  **Storage**: Enriched course data is saved to the **PostgreSQL** database. Duplicate URLs are handled via an "upsert" mechanism (checking existence before updating).

### 2. Data Serving Flow
1.  **API**: The FastAPI backend exposes endpoints to query the database.
2.  **Frontend**: The Next.js frontend fetches course data from the API and renders it in a responsive grid layout.

---

## Module Roles & Key Components

### 1. Core Logic (`/base.py`)
This is the heart of the original scraping logic, adapted for the web platform.
-   **`Course` Class**: Represents a single course entity. Handles URL normalization, slug generation, and metadata storage.
-   **`Scraper` Class**: Manages the scraping lifecycle.
    -   Contains methods for each supported site (e.g., `rd` for Real Discount, `cv` for Course Vania).
    -   Handles threading for concurrent scraping of different sites.

### 2. Web Backend (`/web_backend`)
Wraps the core logic in a modern API server.
-   **`main.py`**: The entry point for the FastAPI application.
    -   **`scrape_job`**: The background task that orchestrates scraping and database saving.
    -   **Endpoints**:
        -   `GET /courses`: Returns paginated, filtered course lists.
        -   `POST /scrape`: Triggers the `scrape_job` in the background.
        -   `GET /admin/logs`: Fetches recent application logs from Redis.
-   **`scraper_wrapper.py`**: A bridge module.
    -   **`get_all_courses()`**: Helper function that initializes the `Scraper` and runs the enrichment process logic.
-   **`models.py`**: Defines the SQLAlchemy database model (`Course` table).
-   **`database.py`**: Handles database connection and session management.

### 3. Web Frontend (`/web_frontend`)
A Next.js 16 application using the App Router.
-   Displays courses in a card layout.
-   Communicates with the Backend API via server-side and client-side fetching.

### 4. Infrastructure
-   **PostgreSQL**: Primary data store for courses.
-   **Redis**: Used for storing logs and managing application locks.
-   **Docker Compose**: Defines the service mesh (db, redis, backend, frontend).

---

## Technical Stack

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | Next.js 16, React 19, Tailwind CSS | Modern, responsive UI with server-side rendering. |
| **Backend** | FastAPI, Uvicorn | High-performance Python async API frameowrk. |
| **Scraper** | Aiohttp, Cloudscraper, BS4 | Robust scraping with anti-bot protection handling. |
| **Database** | PostgreSQL 15 | Relational data storage. |
| **Task Queue** | APScheduler | In-app scheduling for periodic scraping. |
| **Logging** | Loguru, Redis | Distributed logging system. |

---

## How to Run

1.  **Prerequisites**: Ensure Docker and Docker Compose are installed.
2.  **Start Services**:
    ```bash
    docker-compose up --build -d
    ```
3.  **Access Application**:
    -   **Web Interface**: [http://localhost:3000](http://localhost:3000)
    -   **API Documentation**: [http://localhost:8000/docs](http://localhost:8000/docs)

### API Usage
To manually update the course database:
```bash
curl -X POST http://localhost:8000/scrape
```
*Note: The first scrape may take a few minutes to complete.*
