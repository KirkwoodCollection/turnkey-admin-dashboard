import { renderHook, act } from '../../setup/testUtils';
import { useWebSocket } from '../../../src/hooks/useWebSocket';
import { WebSocketProvider } from '../../../src/contexts/WebSocketContext';

// Mock WebSocket
class MockWebSocket {
  static instances: MockWebSocket[] = [];
  
  url: string;
  readyState: number = WebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
    
    // Simulate connection after a tick
    setTimeout(() => {
      this.readyState = WebSocket.OPEN;
      this.onopen?.(new Event('open'));
    }, 0);
  }

  send(data: string) {
    // Mock send functionality
  }

  close() {
    this.readyState = WebSocket.CLOSED;
    this.onclose?.(new CloseEvent('close'));
  }

  static mockSendMessage(message: any) {
    const instance = this.instances[this.instances.length - 1];
    if (instance && instance.onmessage) {
      instance.onmessage(new MessageEvent('message', { data: JSON.stringify(message) }));
    }
  }

  static clear() {
    this.instances = [];
  }
}

// Replace global WebSocket
global.WebSocket = MockWebSocket as any;

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <WebSocketProvider url="ws://localhost:3003">
    {children}
  </WebSocketProvider>
);

describe('useWebSocket', () => {
  beforeEach(() => {
    MockWebSocket.clear();
  });

  it('returns initial connection state', () => {
    const { result } = renderHook(() => useWebSocket(), { wrapper });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.connectionState).toBe('connecting');
    expect(result.current.lastMessage).toBe(null);
  });

  it('updates connection state when WebSocket connects', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useWebSocket(), { wrapper });

    await waitForNextUpdate();

    expect(result.current.isConnected).toBe(true);
    expect(result.current.connectionState).toBe('connected');
  });

  it('handles incoming messages', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useWebSocket(), { wrapper });

    await waitForNextUpdate();

    const testMessage = {
      type: 'METRICS_UPDATE',
      payload: { activeUsers: 50 },
      timestamp: '2024-01-15T10:30:00Z',
    };

    act(() => {
      MockWebSocket.mockSendMessage(testMessage);
    });

    expect(result.current.lastMessage).toEqual(testMessage);
  });

  it('subscribes to specific message types', async () => {
    const onMetricsUpdate = jest.fn();
    const { result, waitForNextUpdate } = renderHook(() => 
      useWebSocket({ onMetricsUpdate }), 
      { wrapper }
    );

    await waitForNextUpdate();

    const metricsMessage = {
      type: 'METRICS_UPDATE',
      payload: { activeUsers: 50 },
      timestamp: '2024-01-15T10:30:00Z',
    };

    act(() => {
      MockWebSocket.mockSendMessage(metricsMessage);
    });

    expect(onMetricsUpdate).toHaveBeenCalledWith(metricsMessage.payload);
  });

  it('handles session update messages', async () => {
    const onSessionUpdate = jest.fn();
    const { result, waitForNextUpdate } = renderHook(() => 
      useWebSocket({ onSessionUpdate }), 
      { wrapper }
    );

    await waitForNextUpdate();

    const sessionMessage = {
      type: 'SESSION_UPDATE',
      payload: { sessionId: 'test-session', status: 'LIVE' },
      timestamp: '2024-01-15T10:30:00Z',
    };

    act(() => {
      MockWebSocket.mockSendMessage(sessionMessage);
    });

    expect(onSessionUpdate).toHaveBeenCalledWith(sessionMessage.payload);
  });

  it('provides send message functionality', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useWebSocket(), { wrapper });

    await waitForNextUpdate();

    const sendSpy = jest.spyOn(MockWebSocket.instances[0], 'send');

    act(() => {
      result.current.sendMessage({ type: 'SUBSCRIBE_METRICS' });
    });

    expect(sendSpy).toHaveBeenCalledWith(
      JSON.stringify({ type: 'SUBSCRIBE_METRICS' })
    );
  });

  it('handles connection errors', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useWebSocket(), { wrapper });

    act(() => {
      const instance = MockWebSocket.instances[0];
      instance.readyState = WebSocket.CLOSED;
      instance.onerror?.(new Event('error'));
    });

    expect(result.current.connectionState).toBe('error');
    expect(result.current.isConnected).toBe(false);
  });

  it('handles connection close', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useWebSocket(), { wrapper });

    await waitForNextUpdate();

    act(() => {
      MockWebSocket.instances[0].close();
    });

    expect(result.current.connectionState).toBe('closed');
    expect(result.current.isConnected).toBe(false);
  });

  it('attempts reconnection on disconnect', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useWebSocket(), { wrapper });

    await waitForNextUpdate();

    act(() => {
      MockWebSocket.instances[0].close();
    });

    expect(result.current.connectionState).toBe('closed');

    // Wait for reconnection attempt
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    expect(MockWebSocket.instances.length).toBeGreaterThan(1);
  });

  it('provides reconnect function', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useWebSocket(), { wrapper });

    await waitForNextUpdate();

    act(() => {
      result.current.reconnect();
    });

    // Should create a new WebSocket instance
    expect(MockWebSocket.instances.length).toBe(2);
  });

  it('handles malformed JSON messages gracefully', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useWebSocket(), { wrapper });

    await waitForNextUpdate();

    act(() => {
      const instance = MockWebSocket.instances[0];
      instance.onmessage?.(new MessageEvent('message', { data: 'invalid json' }));
    });

    // Should not crash, lastMessage should remain null
    expect(result.current.lastMessage).toBe(null);
  });

  it('tracks message history when requested', async () => {
    const { result, waitForNextUpdate } = renderHook(() => 
      useWebSocket({ keepHistory: true }), 
      { wrapper }
    );

    await waitForNextUpdate();

    const message1 = { type: 'MESSAGE_1', payload: {} };
    const message2 = { type: 'MESSAGE_2', payload: {} };

    act(() => {
      MockWebSocket.mockSendMessage(message1);
    });

    act(() => {
      MockWebSocket.mockSendMessage(message2);
    });

    expect(result.current.messageHistory).toHaveLength(2);
    expect(result.current.messageHistory[0]).toEqual(message1);
    expect(result.current.messageHistory[1]).toEqual(message2);
  });

  it('limits message history size', async () => {
    const { result, waitForNextUpdate } = renderHook(() => 
      useWebSocket({ keepHistory: true, maxHistorySize: 2 }), 
      { wrapper }
    );

    await waitForNextUpdate();

    const messages = Array.from({ length: 5 }, (_, i) => ({
      type: `MESSAGE_${i}`,
      payload: {},
    }));

    messages.forEach(message => {
      act(() => {
        MockWebSocket.mockSendMessage(message);
      });
    });

    expect(result.current.messageHistory).toHaveLength(2);
    expect(result.current.messageHistory[0]).toEqual(messages[3]);
    expect(result.current.messageHistory[1]).toEqual(messages[4]);
  });
});