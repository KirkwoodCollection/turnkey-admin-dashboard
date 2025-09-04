# WebSocket Service Layer

## Purpose
Manages WebSocket connections and real-time event streaming for the dashboard.

## Architecture
- Singleton service instance
- Automatic reconnection with exponential backoff
- Event emitter pattern for subscriptions
- Message queue for offline resilience

## Implementation Requirements

### Connection Management
```typescript
interface WebSocketService {
  connect(): Promise<void>;
  disconnect(): void;
  subscribe(event: string, handler: Function): void;
  unsubscribe(event: string, handler: Function): void;
  send(message: any): void;
}
```

### Reconnection Strategy
- Initial connection timeout: 5 seconds
- Exponential backoff: 1s, 2s, 4s, 8s, max 30s
- Preserve subscriptions during reconnection
- Queue messages while disconnected
- Flush queue on reconnection

### Event Types
- `session.started`: New user session
- `session.updated`: Session state change
- `booking.attempted`: Booking attempt
- `booking.completed`: Successful booking
- `metrics.updated`: KPI changes
- `system.alert`: System notifications

### Error Handling
- Log all connection failures
- Emit connection status changes
- Fallback to REST API polling
- Show user-friendly error messages

### Security
- Authenticate via JWT in connection params
- Validate all incoming messages
- Rate limit outgoing messages
- No sensitive data in WebSocket frames