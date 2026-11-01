# ==========================================
# Stage 1: Build the React + Vite Frontend
# ==========================================
FROM node:20-alpine AS frontend-builder

WORKDIR /build

# Copy dependency manifests (lockfile included for reproducible installs)
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

# Copy source and build static artifacts
COPY frontend/ ./
RUN npm run build

# ==========================================
# Stage 2: Python Backend & Production Runner
# ==========================================
FROM python:3.12-slim AS runner

WORKDIR /app

# Install curl for Docker health check
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python backend dependencies
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application source
COPY backend/app/ ./app/

# Copy built frontend from Stage 1
COPY --from=frontend-builder /build/dist /app/frontend/dist

# Setup persistent data directory
RUN mkdir -p /app/data

# Environment configuration
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    REPOHUNTER_DATA_DIR=/app/data \
    REPOHUNTER_STATIC_DIR=/app/frontend/dist \
    PORT=3000

# Expose single application port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Start Uvicorn serving both REST API and Frontend SPA
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "3000"]
