# WebSocketContext Provider

## Purpose
React Context provider for managing global WebSocket connection state and event subscriptions.

## Context Architecture
Provides WebSocket functionality to all components through React Context, ensuring single connection management.

## Context Interface
```typescript
interface WebSocketContextValue {
  isConnected: boolean;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  subscribe: (event: string, handler: Function) => void;
  unsubscribe: (event: string, handler: Function) => void;
  send: (message: any) => void;
  reconnect: () => void;
}
```

## Provider Implementation
```typescript
export const WebSocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Connection management logic
  // Event subscription handling
  // Automatic reconnection
  
  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
};
```

## Usage Pattern
```typescript
// At app root
<WebSocketProvider>
  <App />
</WebSocketProvider>

// In components
const { isConnected, subscribe } = useContext(WebSocketContext);
```

## Features
- Single WebSocket connection for entire app
- Automatic reconnection handling
- Event subscription management
- Connection status broadcasting
- Error recovery mechanisms