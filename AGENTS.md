# Repository Guidelines

## Project Structure & Module Organization
- `web_backend/`: FastAPI API, SQLAlchemy models, schema definitions, scraper wrapper, and backend Dockerfile.
- `web_frontend/`: Next.js App Router UI (`app/`, `components/`, `lib/`, `types/`) with its own Dockerfile and npm scripts.
- `base.py`: Core scraper logic shared by the backend.
- `docker-compose.yml`: Orchestrates `frontend`, `backend`, `db` (PostgreSQL), and `redis`.
- Root utility scripts: `verify_cors.sh` and deployment helpers.

## Build, Test, and Development Commands
- `docker-compose up --build -d`: Build and start the full stack.
- `docker-compose logs -f backend`: Stream backend logs during scraping/API work.
- `python3 web_backend/main.py`: Run backend locally without Docker.
- `pip install -r web_backend/requirements.txt`: Install backend dependencies.
- `cd web_frontend && npm install && npm run dev`: Run frontend dev server.
- `cd web_frontend && npm run build`: Production build check.
- `cd web_frontend && npm run lint`: Run ESLint (Next.js + TypeScript rules).
- `bash verify_cors.sh`: Quick local CORS verification.

## Coding Style & Naming Conventions
- Python: follow PEP 8, 4-space indentation, `snake_case` for functions/variables, `PascalCase` for classes.
- TypeScript/React: component files in `PascalCase` (e.g., `CourseCard.tsx`), helpers in lowercase (`api.ts`, `logger.ts`).
- Keep API/data model field names consistent across backend schemas and frontend types (e.g., `is_subscribed`, `thumbnail_url`).
- Prefer small, focused modules; place UI logic in `components/` and data calls in `lib/`.

## Testing Guidelines
- Current coverage is mostly lint and runtime verification; no dedicated automated test suite is checked in yet.
- Before opening a PR, run `npm run lint`, `npm run build`, `python3 web_backend/verify_compat.py`, and `bash verify_cors.sh`.
- Manually validate key paths: `POST /scrape`, `GET /courses`, and subscription toggle endpoint.

## Commit & Pull Request Guidelines
- Follow Conventional Commit style seen in history: `feat(scope): ...`, `fix(scope): ...`, `chore(scope): ...`.
- Keep commits scoped to one logical change and use imperative, descriptive subjects.
- PRs should include: purpose, affected areas (`web_backend`, `web_frontend`, infra), verification steps, and screenshots for UI changes.
- Link related issues/tasks and call out schema/API contract changes explicitly.

## Security & Configuration Tips
- Do not commit real secrets or private keys. Use environment variables for credentials and API endpoints.
- Keep local overrides in untracked files; treat values in `docker-compose.yml` as development defaults only.
