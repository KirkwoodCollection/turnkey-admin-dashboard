# Admin Dashboard Subdomain Deployment Guide

## Overview
This guide shows how to deploy the Admin Dashboard at `app.turnkeyhms.com` (or any subdomain) for a clean, professional setup.

## Recommended Subdomains
- `app.turnkeyhms.com` - Main admin application
- `admin.turnkeyhms.com` - Admin panel
- `dashboard.turnkeyhms.com` - Analytics dashboard
- `console.turnkeyhms.com` - Management console

## Architecture
```
Internet → app.turnkeyhms.com → Admin Dashboard Service (port 80)
```

## DNS Configuration

### 1. Add DNS Record
```
Type: A Record
Name: app
Value: [Your server IP]
TTL: 300

OR

Type: CNAME
Name: app
Value: turnkeyhms.com
TTL: 300
```

### 2. SSL Certificate
```bash
# If using Let's Encrypt
certbot --nginx -d app.turnkeyhms.com

# If using Cloudflare, AWS, etc.
# Add the subdomain to your existing wildcard cert
# *.turnkeyhms.com should cover app.turnkeyhms.com
```

## Deployment Options

### Option 1: Dedicated Server Block (Nginx)

```nginx
server {
    listen 80;
    listen 443 ssl http2;
    server_name app.turnkeyhms.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/app.turnkeyhms.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.turnkeyhms.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Serve the React app
    root /var/www/app.turnkeyhms.com;
    index index.html;

    # API proxy to main API gateway
    location /api/ {
        proxy_pass https://api.turnkeyhms.com/;
        proxy_set_header Host api.turnkeyhms.com;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # CORS headers
        add_header Access-Control-Allow-Origin "https://app.turnkeyhms.com" always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Authorization, Content-Type" always;
        add_header Access-Control-Allow-Credentials "true" always;
    }

    # WebSocket proxy
    location /ws/ {
        proxy_pass https://api.turnkeyhms.com/ws/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host api.turnkeyhms.com;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # React Router support
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Static assets caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # Health check
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name app.turnkeyhms.com;
    return 301 https://$server_name$request_uri;
}
```

### Option 2: Docker Compose with Traefik

```yaml
version: '3.8'
services:
  admin-dashboard:
    build: .
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.admin-dashboard.rule=Host(`app.turnkeyhms.com`)"
      - "traefik.http.routers.admin-dashboard.tls=true"
      - "traefik.http.routers.admin-dashboard.tls.certresolver=letsencrypt"
      - "traefik.http.services.admin-dashboard.loadbalancer.server.port=80"
    networks:
      - traefik-network
    environment:
      - NODE_ENV=production

networks:
  traefik-network:
    external: true
```

### Option 3: Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: admin-dashboard
spec:
  replicas: 2
  selector:
    matchLabels:
      app: admin-dashboard
  template:
    metadata:
      labels:
        app: admin-dashboard
    spec:
      containers:
      - name: admin-dashboard
        image: turnkey-admin-dashboard:latest
        ports:
        - containerPort: 80
        env:
        - name: NODE_ENV
          value: "production"
---
apiVersion: v1
kind: Service
metadata:
  name: admin-dashboard-service
spec:
  selector:
    app: admin-dashboard
  ports:
  - port: 80
    targetPort: 80
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: admin-dashboard-ingress
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  tls:
  - hosts:
    - app.turnkeyhms.com
    secretName: admin-dashboard-tls
  rules:
  - host: app.turnkeyhms.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: admin-dashboard-service
            port:
              number: 80
```

## Environment Configuration

### Production Environment Variables
```bash
# .env.production
VITE_API_BASE_URL=https://api.turnkeyhms.com
VITE_WS_URL=wss://api.turnkeyhms.com/ws

# Analytics Service
REACT_APP_ANALYTICS_API_URL=https://api.turnkeyhms.com/api/v1
REACT_APP_ANALYTICS_WS_URL=wss://api.turnkeyhms.com/ws/analytics

# Events Service
REACT_APP_EVENTS_API_URL=https://api.turnkeyhms.com/api/v1
REACT_APP_EVENTS_WS_URL=wss://api.turnkeyhms.com/ws/events

# Feature Flags
VITE_ENABLE_WEBSOCKETS=true
VITE_ENABLE_REALTIME_UPDATES=true
VITE_DEV_MODE=false
```

## CDN/Performance Configuration

### Cloudflare Settings
1. **DNS**: Add A record for `app` subdomain
2. **SSL**: Full (strict) mode
3. **Caching**: Cache everything, custom rules for `/api/*`
4. **Speed**: Enable Auto Minify, Brotli, HTTP/2

### AWS CloudFront
```json
{
  "Origins": [
    {
      "Id": "admin-dashboard-origin",
      "DomainName": "app.turnkeyhms.com",
      "CustomOriginConfig": {
        "HTTPPort": 80,
        "HTTPSPort": 443,
        "OriginProtocolPolicy": "https-only"
      }
    }
  ],
  "DefaultCacheBehavior": {
    "TargetOriginId": "admin-dashboard-origin",
    "ViewerProtocolPolicy": "redirect-to-https",
    "CachePolicyId": "custom-spa-caching"
  }
}
```

## Build & Deploy Process

### 1. Build for Production
```bash
# Install dependencies
npm ci --production

# Build with subdomain config
npm run build:production

# Verify build
ls -la dist/
```

### 2. Docker Build
```bash
# Build image
docker build -f Dockerfile.production -t turnkey-admin-dashboard:latest .

# Tag for registry
docker tag turnkey-admin-dashboard:latest registry.turnkeyhms.com/admin-dashboard:latest

# Push to registry
docker push registry.turnkeyhms.com/admin-dashboard:latest
```

### 3. Deploy Script
```bash
#!/bin/bash
# deploy.sh

echo "Deploying Admin Dashboard to app.turnkeyhms.com..."

# Pull latest image
docker pull registry.turnkeyhms.com/admin-dashboard:latest

# Stop existing container
docker stop admin-dashboard 2>/dev/null || true
docker rm admin-dashboard 2>/dev/null || true

# Run new container
docker run -d \
  --name admin-dashboard \
  --restart unless-stopped \
  -p 3001:80 \
  registry.turnkeyhms.com/admin-dashboard:latest

# Check health
sleep 5
curl -f http://localhost:3001/health || exit 1

echo "✅ Deployment successful!"
echo "🌐 Available at: https://app.turnkeyhms.com"
```

## URL Structure

After deployment:
- `https://app.turnkeyhms.com` → **Analytics Dashboard** (main page)
- `https://app.turnkeyhms.com/overview` → Overview page
- `https://app.turnkeyhms.com/system-health` → System Health
- `https://app.turnkeyhms.com/analytics` → Analytics Dashboard
- `https://app.turnkeyhms.com/analytics/grafana/*` → Grafana integration

## Testing Deployment

### 1. DNS Resolution
```bash
nslookup app.turnkeyhms.com
# Should resolve to your server IP
```

### 2. SSL Certificate
```bash
curl -I https://app.turnkeyhms.com
# Should return 200 with valid SSL
```

### 3. Application Health
```bash
curl https://app.turnkeyhms.com/health
# Should return: healthy
```

### 4. API Connectivity
```bash
curl https://app.turnkeyhms.com/api/v1/analytics/metrics/overview
# Should return analytics data
```

## Benefits of Subdomain Approach

✅ **Clean URLs**: No `/admin` prefix needed
✅ **Independent SSL**: Dedicated certificate for the subdomain
✅ **Easier CDN**: Simple caching rules
✅ **Better SEO**: Clear separation from main website
✅ **Mobile**: Easier to bookmark on mobile devices
✅ **Scaling**: Can easily move to different servers
✅ **Branding**: Professional appearance

## Security Considerations

1. **Subdomain Isolation**: Natural security boundary
2. **CORS Configuration**: Specific origin allowlist
3. **CSP Headers**: Subdomain-specific content security
4. **Rate Limiting**: Independent rate limiting per subdomain
5. **Authentication**: Centralized auth with subdomain validation

This approach gives you a professional, scalable admin interface at `app.turnkeyhms.com`! 🚀