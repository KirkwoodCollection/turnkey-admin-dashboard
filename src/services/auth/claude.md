# Authentication Service Layer

## Purpose
Authentication and authorization management integrated with Firebase Auth.

## Service Architecture
- Firebase Auth integration
- JWT token management
- Role-based access control
- Session persistence

## Authentication Flow
1. User login via Firebase Auth
2. Receive JWT token
3. Store token securely
4. Attach token to API requests
5. Handle token refresh automatically

## Authorization Levels
- `admin`: Full dashboard access
- `manager`: Limited management features
- `analyst`: Read-only analytics access
- `viewer`: Basic metrics viewing

## Security Measures
- Secure token storage
- Automatic logout on token expiry
- CSRF protection
- Rate limiting for auth attempts

## Integration Points
- All API requests include auth headers
- WebSocket authentication
- Route protection based on roles
- Error handling for auth failures