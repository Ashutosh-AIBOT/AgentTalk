# Stage 1: Build the frontend static files
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend
COPY voice-agent/frontend/package*.json ./
RUN npm install
COPY voice-agent/frontend/ ./
RUN npm run build

# Stage 2: Set up the final Python environment
FROM python:3.11-slim
WORKDIR /app

# Install system dependencies (including build tools for sound/voice libraries)
RUN apt-get update && apt-get install -y \
    curl \
    git \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install python requirements
COPY voice-agent/backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
# Install Silero and noise cancellation plugins
RUN pip install --no-cache-dir livekit-plugins-silero livekit-plugins-noise-cancellation

# Copy backend files
COPY voice-agent/backend/ ./

# Copy built frontend static files to backend static directory
COPY --from=frontend-builder /app/frontend/out ./static

# Copy startup script
COPY start.sh ./
RUN chmod +x start.sh

# Expose port 7860 (Hugging Face default)
EXPOSE 7860

# Set entrypoint
CMD ["./start.sh"]
