# Context Providers

## Purpose
Application-wide state management for cross-cutting concerns.

## Context Organization

### EventsContext (ADR-002 Updated)
- Admin WebSocket connection state via `useAdminRealtimeWebSocket`
- JWT-authenticated real-time connections
- Fallback to Events WebSocket when needed
- Connection type tracking (admin vs events)
- Event subscription handling
- Automatic reconnection with token refresh

### WebSocketContext (Legacy - for non-admin connections)
- Global WebSocket connection state
- Connection status management
- Event subscription handling
- Automatic reconnection logic

### FilterContext
- Time range selections
- Dimension filters
- Search queries
- Filter persistence

### AuthContext
- User authentication state
- Role-based permissions
- Session management
- Logout handling

## Context Patterns
- Provider composition at app root
- Custom hooks for context consumption
- Error boundaries around providers
- Loading states for async contexts

## Performance Considerations
- Memoize context values
- Split contexts by update frequency
- Avoid unnecessary re-renders
- Use Context selectors where needed