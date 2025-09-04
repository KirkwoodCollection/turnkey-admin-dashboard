# Context Providers

## Purpose
Application-wide state management for cross-cutting concerns.

## Context Organization

### WebSocketContext
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