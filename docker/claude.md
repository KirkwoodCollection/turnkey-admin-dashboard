# Docker Configuration

## Purpose
Containerized deployment configuration for consistent environments across development, staging, and production.

## Container Strategy
- Multi-stage builds for optimization
- Separate containers for build and runtime
- Layer caching for faster builds
- Security scanning integration

## Configuration Files
- `Dockerfile`: Main application container
- `docker-compose.yml`: Local development setup
- `docker-compose.prod.yml`: Production configuration
- `.dockerignore`: Build context optimization

## Build Optimization
```dockerfile
# Multi-stage build example
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM nginx:alpine AS runtime
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
```

## Environment Variables
- `REACT_APP_API_URL`: Backend API endpoint
- `REACT_APP_WS_URL`: WebSocket gateway URL
- `REACT_APP_AUTH_DOMAIN`: Firebase Auth domain
- `NODE_ENV`: Environment mode

## Security Considerations
- Non-root user execution
- Minimal base images
- No secrets in build layers
- Regular security updates