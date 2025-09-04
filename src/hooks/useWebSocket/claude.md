# useWebSocket Hook

## Purpose
Custom React hook for managing WebSocket connections and subscriptions.

## Implementation
Provides a clean interface for components to subscribe to WebSocket events without managing connection details.

## Hook Interface
```typescript
interface UseWebSocketReturn {
  isConnected: boolean;
  subscribe: (event: string, handler: Function) => void;
  unsubscribe: (event: string, handler: Function) => void;
  send: (message: any) => void;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
}
```

## Usage Pattern
```typescript
const MyComponent = () => {
  const { subscribe, unsubscribe, isConnected } = useWebSocket();
  
  useEffect(() => {
    const handler = (data) => {
      // Handle real-time data
    };
    
    subscribe('event_type', handler);
    return () => unsubscribe('event_type', handler);
  }, [subscribe, unsubscribe]);
};
```

## Features
- Automatic connection management
- Subscription cleanup on unmount
- Connection status monitoring
- Error handling and recovery