FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y gcc

# Copy requirements from web_backend
COPY web_backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
# Copy source code
COPY . .

# Set PYTHONPATH to include web_backend directory
ENV PYTHONPATH="/app/web_backend:${PYTHONPATH}"

# Expose port
EXPOSE 8000

# Run the application
CMD ["uvicorn", "web_backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
