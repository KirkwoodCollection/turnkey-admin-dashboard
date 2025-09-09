import { renderHook, act } from '../../setup/testUtils';
import { useLiveEvents } from '../../../src/hooks/useLiveEvents';
import { WebSocketProvider } from '../../../src/contexts/WebSocketContext';
import { mockAnalyticsEvents } from '../../fixtures/mockData';

// Mock WebSocket similar to useWebSocket test
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
    
    setTimeout(() => {
      this.readyState = WebSocket.OPEN;
      this.onopen?.(new Event('open'));
    }, 0);
  }

  send(data: string) {}

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

global.WebSocket = MockWebSocket as any;

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <WebSocketProvider url="ws://localhost:3003">
    {children}
  </WebSocketProvider>
);

describe('useLiveEvents', () => {
  beforeEach(() => {
    MockWebSocket.clear();
  });

  it('returns initial state', () => {
    const { result } = renderHook(() => useLiveEvents(), { wrapper });

    expect(result.current.events).toEqual([]);
    expect(result.current.isConnected).toBe(false);
    expect(result.current.eventCount).toBe(0);
  });

  it('connects and updates connection state', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useLiveEvents(), { wrapper });

    await waitForNextUpdate();

    expect(result.current.isConnected).toBe(true);
  });

  it('receives and stores live events', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useLiveEvents(), { wrapper });

    await waitForNextUpdate();

    const analyticsEvent = {
      type: 'ANALYTICS_EVENT',
      payload: mockAnalyticsEvents[0],
      timestamp: '2024-01-15T10:30:00Z',
      id: 'test-event-1',
    };

    act(() => {
      MockWebSocket.mockSendMessage(analyticsEvent);
    });

    expect(result.current.events).toHaveLength(1);
    expect(result.current.events[0]).toEqual(analyticsEvent);
    expect(result.current.eventCount).toBe(1);
  });

  it('filters events by type', async () => {
    const { result, waitForNextUpdate } = renderHook(() => 
      useLiveEvents({ filterByType: ['SESSION_UPDATE'] }), 
      { wrapper }
    );

    await waitForNextUpdate();

    const sessionEvent = {
      type: 'SESSION_UPDATE',
      payload: { sessionId: 'test', status: 'LIVE' },
      timestamp: '2024-01-15T10:30:00Z',
    };

    const metricsEvent = {
      type: 'METRICS_UPDATE',
      payload: { activeUsers: 50 },
      timestamp: '2024-01-15T10:31:00Z',
    };

    act(() => {
      MockWebSocket.mockSendMessage(sessionEvent);
      MockWebSocket.mockSendMessage(metricsEvent);
    });

    expect(result.current.events).toHaveLength(1);
    expect(result.current.events[0]).toEqual(sessionEvent);
  });

  it('limits event history size', async () => {
    const { result, waitForNextUpdate } = renderHook(() => 
      useLiveEvents({ maxEvents: 2 }), 
      { wrapper }
    );

    await waitForNextUpdate();

    const events = [
      { type: 'EVENT_1', payload: {}, timestamp: '2024-01-15T10:30:00Z' },
      { type: 'EVENT_2', payload: {}, timestamp: '2024-01-15T10:31:00Z' },
      { type: 'EVENT_3', payload: {}, timestamp: '2024-01-15T10:32:00Z' },
    ];

    events.forEach(event => {
      act(() => {
        MockWebSocket.mockSendMessage(event);
      });
    });

    expect(result.current.events).toHaveLength(2);
    expect(result.current.events[0]).toEqual(events[1]);
    expect(result.current.events[1]).toEqual(events[2]);
  });

  it('provides clear events functionality', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useLiveEvents(), { wrapper });

    await waitForNextUpdate();

    const event = {
      type: 'TEST_EVENT',
      payload: {},
      timestamp: '2024-01-15T10:30:00Z',
    };

    act(() => {
      MockWebSocket.mockSendMessage(event);
    });

    expect(result.current.events).toHaveLength(1);

    act(() => {
      result.current.clearEvents();
    });

    expect(result.current.events).toHaveLength(0);
    expect(result.current.eventCount).toBe(0);
  });

  it('tracks event statistics', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useLiveEvents(), { wrapper });

    await waitForNextUpdate();

    const events = [
      { type: 'SESSION_UPDATE', payload: {}, timestamp: '2024-01-15T10:30:00Z' },
      { type: 'METRICS_UPDATE', payload: {}, timestamp: '2024-01-15T10:31:00Z' },
      { type: 'SESSION_UPDATE', payload: {}, timestamp: '2024-01-15T10:32:00Z' },
    ];

    events.forEach(event => {
      act(() => {
        MockWebSocket.mockSendMessage(event);
      });
    });

    expect(result.current.eventCount).toBe(3);
    expect(result.current.eventStats).toEqual({
      SESSION_UPDATE: 2,
      METRICS_UPDATE: 1,
    });
  });

  it('handles event callbacks', async () => {
    const onEvent = jest.fn();
    const { result, waitForNextUpdate } = renderHook(() => 
      useLiveEvents({ onEvent }), 
      { wrapper }
    );

    await waitForNextUpdate();

    const event = {
      type: 'TEST_EVENT',
      payload: { data: 'test' },
      timestamp: '2024-01-15T10:30:00Z',
    };

    act(() => {
      MockWebSocket.mockSendMessage(event);
    });

    expect(onEvent).toHaveBeenCalledWith(event);
  });

  it('handles specific event type callbacks', async () => {
    const onSessionUpdate = jest.fn();
    const onMetricsUpdate = jest.fn();

    const { result, waitForNextUpdate } = renderHook(() => 
      useLiveEvents({ onSessionUpdate, onMetricsUpdate }), 
      { wrapper }
    );

    await waitForNextUpdate();

    const sessionEvent = {
      type: 'SESSION_UPDATE',
      payload: { sessionId: 'test' },
      timestamp: '2024-01-15T10:30:00Z',
    };

    const metricsEvent = {
      type: 'METRICS_UPDATE',
      payload: { activeUsers: 50 },
      timestamp: '2024-01-15T10:31:00Z',
    };

    act(() => {
      MockWebSocket.mockSendMessage(sessionEvent);
      MockWebSocket.mockSendMessage(metricsEvent);
    });

    expect(onSessionUpdate).toHaveBeenCalledWith(sessionEvent.payload);
    expect(onMetricsUpdate).toHaveBeenCalledWith(metricsEvent.payload);
  });

  it('pauses event collection when requested', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useLiveEvents(), { wrapper });

    await waitForNextUpdate();

    act(() => {
      result.current.pauseEvents();
    });

    expect(result.current.isPaused).toBe(true);

    const event = {
      type: 'TEST_EVENT',
      payload: {},
      timestamp: '2024-01-15T10:30:00Z',
    };

    act(() => {
      MockWebSocket.mockSendMessage(event);
    });

    // Event should not be added when paused
    expect(result.current.events).toHaveLength(0);

    act(() => {
      result.current.resumeEvents();
    });

    expect(result.current.isPaused).toBe(false);

    act(() => {
      MockWebSocket.mockSendMessage(event);
    });

    // Event should be added when resumed
    expect(result.current.events).toHaveLength(1);
  });

  it('provides latest event getter', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useLiveEvents(), { wrapper });

    await waitForNextUpdate();

    const event1 = {
      type: 'EVENT_1',
      payload: {},
      timestamp: '2024-01-15T10:30:00Z',
    };

    const event2 = {
      type: 'EVENT_2',
      payload: {},
      timestamp: '2024-01-15T10:31:00Z',
    };

    act(() => {
      MockWebSocket.mockSendMessage(event1);
    });

    expect(result.current.latestEvent).toEqual(event1);

    act(() => {
      MockWebSocket.mockSendMessage(event2);
    });

    expect(result.current.latestEvent).toEqual(event2);
  });

  it('handles reconnection gracefully', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useLiveEvents(), { wrapper });

    await waitForNextUpdate();

    // Simulate connection loss
    act(() => {
      MockWebSocket.instances[0].close();
    });

    expect(result.current.isConnected).toBe(false);

    // Wait for reconnection
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    // Should attempt to reconnect
    expect(MockWebSocket.instances.length).toBeGreaterThan(1);
  });
});