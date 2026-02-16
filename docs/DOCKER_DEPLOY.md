# Docker Deployment Guide

This guide provides step-by-step instructions for deploying Lantern using Docker.

## Prerequisites

- Docker 20.10+ and Docker Compose 2.0+
- At least 2GB RAM available
- 10GB disk space for database and uploads

## Quick Start

### 1. Generate Security Keys

Generate required security credentials:

```bash
# Generate PostgreSQL password
openssl rand -base64 32

# Generate encryption vault key
openssl rand -hex 32
```

### 2. Configure Environment

Copy the example environment file and add your generated keys:

```bash
cp .env.docker .env
```

Edit `.env` and set:
- `POSTGRES_PASSWORD` - Your generated PostgreSQL password
- `LANTERN_VAULT_KEY` - Your generated 64-character hex encryption key

### 3. Start Services

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Check service health
docker-compose ps
```

### 4. Initialize Database

```bash
# Run database migrations
docker-compose exec lantern npm run db:push
```

### 5. Access Application

Open your browser to:
- **Application**: http://localhost:5000
- **Health Check**: http://localhost:5000/__health (production mode disabled)

## Service Management

### Start/Stop Services

```bash
# Start services
docker-compose up -d

# Stop services (preserves data)
docker-compose stop

# Stop and remove containers (preserves volumes)
docker-compose down

# Stop and remove everything including data
docker-compose down -v
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f lantern
docker-compose logs -f postgres
```

### Restart Services

```bash
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart lantern
```

## Database Management

### Backup Database

```bash
# Create backup
docker-compose exec postgres pg_dump -U lantern lantern > backup-$(date +%Y%m%d-%H%M%S).sql

# Or use pg_dumpall for all databases
docker-compose exec postgres pg_dumpall -U lantern > full-backup-$(date +%Y%m%d-%H%M%S).sql
```

### Restore Database

```bash
# Restore from backup
docker-compose exec -T postgres psql -U lantern lantern < backup.sql
```

### Access Database

```bash
# PostgreSQL shell
docker-compose exec postgres psql -U lantern lantern

# Run SQL query
docker-compose exec postgres psql -U lantern lantern -c "SELECT COUNT(*) FROM cases;"
```

## Security Configuration

### Encryption Key Management

**IMPORTANT**: The `LANTERN_VAULT_KEY` encrypts all source documents at rest.

- **Never commit** encryption keys to version control
- **Backup** the key securely (encrypted password manager, HSM, etc.)
- **Rotate** keys periodically (requires re-encryption migration)
- **Production**: Use 256-bit keys (64 hex characters)

### Key Rotation (Advanced)

If you need to rotate the encryption key:

1. Export all cases with current key
2. Update `LANTERN_VAULT_KEY` in `.env`
3. Restart services
4. Re-import cases (will use new key)

**WARNING**: Changing the key without migration will make existing encrypted data unreadable.

## Monitoring

### Health Checks

```bash
# Application health
curl http://localhost:5000/__health

# PostgreSQL health
docker-compose exec postgres pg_isready -U lantern
```

### Resource Usage

```bash
# Container stats
docker stats lantern-app lantern-postgres

# Disk usage
docker system df
```

## Troubleshooting

### Service Won't Start

**Check logs:**
```bash
docker-compose logs lantern
```

**Common issues:**
1. Missing environment variables → Check `.env` file
2. Port 5000 in use → Change port in `docker-compose.yml`
3. Database connection failed → Check postgres service health

### Encryption Key Error

**Error:** `LANTERN_VAULT_KEY is required`

**Fix:**
1. Ensure `.env` file exists with `LANTERN_VAULT_KEY` set
2. Verify key is 64 hex characters (32 bytes)
3. Restart services: `docker-compose restart lantern`

### Database Connection Error

**Error:** `Connection refused` or `ECONNREFUSED`

**Fix:**
1. Wait for PostgreSQL to be ready: `docker-compose logs postgres`
2. Check health: `docker-compose ps postgres`
3. Verify DATABASE_URL in environment

### Disk Space Issues

**Check usage:**
```bash
docker system df -v
```

**Clean up:**
```bash
# Remove unused images
docker image prune -a

# Remove unused volumes (CAUTION: deletes data)
docker volume prune
```

## Production Deployment

### Security Checklist

- [ ] Set strong `POSTGRES_PASSWORD` (32+ characters)
- [ ] Set secure `LANTERN_VAULT_KEY` (64 hex characters)
- [ ] Set `LANTERN_API_KEY` for API access control
- [ ] Use HTTPS reverse proxy (nginx, Caddy, Traefik)
- [ ] Enable firewall rules (only expose 5000 via proxy)
- [ ] Set up automated backups
- [ ] Monitor disk space and logs
- [ ] Configure log rotation

### Reverse Proxy Example (nginx)

```nginx
server {
    listen 80;
    server_name lantern.yourdomain.com;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name lantern.yourdomain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Environment-Specific Configuration

**Development:**
```bash
docker-compose up
```

**Production:**
```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## Upgrading

### Update Lantern Version

```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Run migrations
docker-compose exec lantern npm run db:push
```

### Database Migrations

```bash
# Check current schema
docker-compose exec postgres psql -U lantern lantern -c "\dt"

# Run migrations
docker-compose exec lantern npm run db:push

# Verify
docker-compose logs lantern
```

## Backup and Recovery

### Full Backup Strategy

**Daily automated backup script:**

```bash
#!/bin/bash
# backup.sh
BACKUP_DIR="/backups/lantern"
DATE=$(date +%Y%m%d-%H%M%S)

# Database backup
docker-compose exec -T postgres pg_dump -U lantern lantern | gzip > "$BACKUP_DIR/db-$DATE.sql.gz"

# Uploads backup
docker run --rm -v lantern_uploads_data:/data -v $BACKUP_DIR:/backup alpine tar czf /backup/uploads-$DATE.tar.gz -C /data .

# Keep only last 30 days
find $BACKUP_DIR -type f -mtime +30 -delete
```

**Recovery:**

```bash
# Restore database
gunzip -c backup/db-20260216.sql.gz | docker-compose exec -T postgres psql -U lantern lantern

# Restore uploads
docker run --rm -v lantern_uploads_data:/data -v $(pwd)/backup:/backup alpine tar xzf /backup/uploads-20260216.tar.gz -C /data
```

## Support

For issues or questions:
- GitHub Issues: https://github.com/Swixixle/Lantern/issues
- Documentation: See `/docs` directory
- Chain-of-Custody: See `CHAIN_OF_CUSTODY.md`

## Additional Resources

- [Chain-of-Custody Verification](./CHAIN_OF_CUSTODY.md)
- [Operator Documentation](./OPERATOR_GUIDE.md)
- [Security Model](../SECURITY.md)
- [API Documentation](./API_REFERENCE.md)
