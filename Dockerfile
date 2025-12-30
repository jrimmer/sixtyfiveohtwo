# Build stage
FROM node:20-alpine AS builder

# Install build dependencies for native modules (bcrypt, better-sqlite3)
RUN apk add --no-cache python3 make g++ git

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
COPY telengard/package*.json ./telengard/
COPY sabotage/sabotage-web/package*.json ./sabotage/sabotage-web/
COPY provinggrounds/package*.json ./provinggrounds/

# Install root dependencies (this triggers postinstall which builds games)
RUN npm ci

# Copy source files
COPY . .

# Production stage
FROM node:20-alpine

# Install runtime dependencies for native modules
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy built application from builder
COPY --from=builder /app .

# Create data directory for SQLite
RUN mkdir -p /app/provinggrounds/data

# Initialize database if it doesn't exist (handled by entrypoint)
COPY <<'EOF' /app/docker-entrypoint.sh
#!/bin/sh
set -e

# Initialize database if it doesn't exist
if [ ! -f "/app/provinggrounds/data/provinggrounds.db" ]; then
  echo "Initializing database..."
  cd /app/provinggrounds && npm run db:init && npm run db:seed
fi

exec "$@"
EOF

RUN chmod +x /app/docker-entrypoint.sh

# Environment defaults
ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_PATH=/app/provinggrounds/data/provinggrounds.db

EXPOSE 3000

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["node", "server.js"]
