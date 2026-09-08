# Stage 1: Build frontend
FROM node:18-alpine AS frontend-build

WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci --ignore-scripts 2>/dev/null || npm install

COPY frontend/ .
RUN npm run build

# Stage 2: Backend + frontend runtime
FROM python:3.11-slim

WORKDIR /app

# Install Python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ /app/backend/

# Copy built frontend
COPY --from=frontend-build /app/frontend/dist /app/frontend/dist

EXPOSE 8001

CMD ["python", "backend/main.py"]
