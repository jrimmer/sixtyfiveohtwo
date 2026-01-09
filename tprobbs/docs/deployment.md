# Deployment

## Coolify / Docker Deployment

TPro BBS is designed for easy deployment on Coolify, Railway, or any Docker-based platform.

### Auto-Initialization

The database automatically seeds on first startup via `ensure.js`:

- Creates schema if tables don't exist
- Seeds game data (weapons, monsters, classes) if empty
- **Preserves existing user data** on restarts

No manual database initialization required!

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | Yes | - | Set to `production` |
| `SESSION_SECRET` | Yes | - | Secure random string |
| `TPROBBS_DATABASE_PATH` | No | `/data/tprobbs.db` | Database file location |
| `PORT` | No | `3000` | Server port |

### Coolify Setup

1. **Create new service** from your Git repository

2. **Set environment variables:**
   ```
   NODE_ENV=production
   SESSION_SECRET=your-secure-random-string-here
   TPROBBS_DATABASE_PATH=/data/tprobbs.db
   ```

3. **Add persistent storage:**
   - Go to your service → Storage → Add Volume
   - Mount path: `/data`
   - This persists the database across deployments

4. **Deploy!**
   - The database will auto-initialize on first startup
   - User data persists across redeployments

### Docker Compose Example

```yaml
version: '3.8'
services:
  sixtyfiveohtwo:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - SESSION_SECRET=${SESSION_SECRET}
      - TPROBBS_DATABASE_PATH=/data/tprobbs.db
    volumes:
      - tprobbs-data:/data

volumes:
  tprobbs-data:
```

### Dockerfile

The root project includes a Dockerfile:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## Railway Deployment

1. Connect your GitHub repository
2. Set environment variables in Railway dashboard
3. Railway auto-detects Node.js and deploys
4. Add a persistent volume for `/data`

## Health Check

A health endpoint is available for load balancers:

```
GET /health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T12:00:00.000Z"
}
```

## Production Checklist

- [ ] `NODE_ENV=production`
- [ ] `SESSION_SECRET` is set (required, will fail without it)
- [ ] Persistent volume mounted at `/data`
- [ ] Health check configured at `/health`
- [ ] HTTPS enabled (cookies require secure connection)

## Troubleshooting

### Database Not Persisting

Ensure you have a persistent volume mounted at `/data`. Without this, the database is recreated on every deployment.

### Session Errors

Make sure `SESSION_SECRET` is set. The server will refuse to start without it in production mode.

### "Database is locked" Errors

SQLite allows only one write at a time. This is normal under load and handled by better-sqlite3. For high-traffic sites, consider a PostgreSQL migration.
