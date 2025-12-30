# syntax=docker/dockerfile:1
# check=skip=SecretsUsedInArgOrEnv

# Build stage
FROM node:20-alpine AS builder

# Install build dependencies for native modules (bcrypt, better-sqlite3)
RUN apk add --no-cache python3 make g++ git

WORKDIR /app

# Copy everything first (source files needed for postinstall build)
COPY . .

# Install dependencies (triggers postinstall which builds games)
RUN npm ci

# Verify builds completed successfully
RUN test -f telengard/dist/index.html || (echo "ERROR: Telengard build failed" && exit 1)
RUN test -f sabotage/sabotage-web/dist/index.html || (echo "ERROR: Sabotage build failed" && exit 1)

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
if [ ! -f "/data/provinggrounds.db" ]; then
  echo "Initializing database..."
  cd /app/provinggrounds && npm run db:init && npm run db:seed
fi

exec "$@"
EOF

RUN chmod +x /app/docker-entrypoint.sh

# Create data directory for all SQLite databases
RUN mkdir -p /data

# Environment defaults
ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_PATH=/data/provinggrounds.db
ENV SESSION_DB_PATH=/data/sessions.db

EXPOSE 3000

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["node", "server.js"]
