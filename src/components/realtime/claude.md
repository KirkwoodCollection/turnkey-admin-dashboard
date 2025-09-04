# Real-time Components Module

## Purpose
Components that display live, streaming data from WebSocket connections.

## Real-time Data Principles
1. Optimistic updates with rollback capability
2. Message deduplication by event ID
3. Automatic reconnection handling
4. Rate limiting for high-frequency updates

## Component Specifications

### ActivityFeed
- Live stream of booking events
- Maximum 100 events in memory
- Virtual scrolling for performance
- Event grouping for similar actions
- Click to expand event details

### LiveSessionMonitor
- Active user session tracking
- Session state transitions
- Abandonment predictions
- Color coding by session health

### ActiveUsersTracker
- Real-time user count
- Breakdown by booking stage
- Geographic distribution
- Peak detection alerts

## WebSocket Integration
```javascript
// Example integration pattern
const useRealtimeComponent = () => {
  const { subscribe, unsubscribe } = useWebSocket();
  
  useEffect(() => {
    const handler = (event) => {
      // Process event
      // Update local state
    };
    
    subscribe('event_type', handler);
    return () => unsubscribe('event_type', handler);
  }, []);
};
```

## Performance Optimizations
- Throttle updates to 60fps maximum
- Batch DOM updates
- Use React.memo for event items
- Virtualize long lists