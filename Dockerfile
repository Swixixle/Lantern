# Lantern Dockerfile
# Production-ready multi-stage build for deployable investigative platform

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Production
FROM node:20-alpine

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built application from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/uploads ./uploads
COPY --from=builder /app/drizzle.config.ts ./

# Create non-root user for security
RUN addgroup -g 1001 -S lantern && \
    adduser -S lantern -u 1001 && \
    chown -R lantern:lantern /app

USER lantern

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/__health', (r) => { \
    r.statusCode === 200 ? process.exit(0) : process.exit(1) \
  })"

# Start application
CMD ["npm", "start"]
