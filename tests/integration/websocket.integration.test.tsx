import React from 'react';
import { renderHook, act, waitFor } from '../setup/testUtils';
import { useWebSocket } from '../../src/hooks/useWebSocket';
import { useLiveEvents } from '../../src/hooks/useLiveEvents';
import { WebSocketProvider } from '../../src/contexts/WebSocketContext';
import { setupMockServer, teardownMockServer } from '../mocks/mockServer';
import { mockDashboardMetrics, mockSessions } from '../fixtures/mockData';

// Advanced WebSocket mock for integration testing
class IntegrationMockWebSocket {
  static instances: IntegrationMockWebSocket[] = [];
  static messageQueue: any[] = [];
  
  url: string;
  readyState: number = WebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  
  private messageHistory: any[] = [];
  private isConnected: boolean = false;

  constructor(url: string) {
    this.url = url;
    IntegrationMockWebSocket.instances.push(this);
    
    // Simulate real WebSocket connection delay
    setTimeout(() => {
      this.readyState = WebSocket.OPEN;
      this.isConnected = true;
      this.onopen?.(new Event('open'));
      this.processQueuedMessages();
    }, 50);
  }

  send(data: string) {
    if (!this.isConnected) {
      throw new Error('WebSocket is not connected');
    }
    
    const message = JSON.parse(data);
    this.messageHistory.push({ type: 'sent', data: message, timestamp: Date.now() });
    
    // Echo certain message types for testing
    if (message.type === 'SUBSCRIBE_METRICS') {
      setTimeout(() => {
        this.simulateMessage({
          type: 'SUBSCRIPTION_CONFIRMED',
          payload: { subscription: 'metrics' },
          timestamp: new Date().toISOString(),
        });
      }, 10);
    }
  }

  close(code?: number, reason?: string) {
    this.readyState = WebSocket.CLOSED;
    this.isConnected = false;
    this.onclose?.(new CloseEvent('close', { code, reason }));
  }

  simulateMessage(message: any) {
    if (this.isConnected && this.onmessage) {
      this.onmessage(new MessageEvent('message', { data: JSON.stringify(message) }));
    }
  }

  private processQueuedMessages() {
    while (IntegrationMockWebSocket.messageQueue.length > 0) {
      const message = IntegrationMockWebSocket.messageQueue.shift();
      this.simulateMessage(message);
    }
  }

  // Static methods for test control
  static queueMessage(message: any) {
    const instance = this.instances[this.instances.length - 1];
    if (instance && instance.isConnected) {
      instance.simulateMessage(message);
    } else {
      this.messageQueue.push(message);
    }
  }

  static simulateNetworkIssue() {
    const instance = this.instances[this.instances.length - 1];
    if (instance) {
      instance.readyState = WebSocket.CLOSED;
      instance.isConnected = false;
      instance.onerror?.(new Event('error'));
      instance.onclose?.(new CloseEvent('close', { code: 1006, reason: 'Network error' }));
    }
  }

  static simulateReconnection() {
    // Create new instance to simulate reconnection
    const instance = this.instances[this.instances.length - 1];
    if (instance) {
      new IntegrationMockWebSocket(instance.url);
    }
  }

  static clear() {
    this.instances = [];
    this.messageQueue = [];
  }

  static getMessageHistory() {
    const instance = this.instances[this.instances.length - 1];
    return instance ? instance.messageHistory : [];
  }
}

global.WebSocket = IntegrationMockWebSocket as any;

const createWrapper = () => ({ children }: { children: React.ReactNode }) => (
  <WebSocketProvider url="ws://localhost:3003">
    {children}
  </WebSocketProvider>
);

describe('WebSocket Integration Tests', () => {
  beforeEach(() => {
    IntegrationMockWebSocket.clear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    IntegrationMockWebSocket.clear();
    jest.useRealTimers();
  });

  describe('Connection Management', () => {
    it('establishes connection and handles initial handshake', async () => {
      const { result } = renderHook(() => useWebSocket(), {
        wrapper: createWrapper(),
      });

      expect(result.current.connectionState).toBe('connecting');
      
      // Fast-forward to connection establishment
      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
        expect(result.current.connectionState).toBe('connected');
      });

      // Should receive connection established message
      expect(result.current.lastMessage?.type).toBe('CONNECTION_ESTABLISHED');
    });

    it('handles connection failures and retries', async () => {
      const { result } = renderHook(() => useWebSocket(), {
        wrapper: createWrapper(),
      });

      // Simulate connection failure
      act(() => {
        IntegrationMockWebSocket.simulateNetworkIssue();
      });

      await waitFor(() => {
        expect(result.current.connectionState).toBe('error');
        expect(result.current.isConnected).toBe(false);
      });

      // Should attempt reconnection
      act(() => {
        jest.advanceTimersByTime(5000); // Wait for retry interval
      });

      await waitFor(() => {
        expect(IntegrationMockWebSocket.instances.length).toBeGreaterThan(1);
      });
    });

    it('maintains connection across component unmounts and remounts', async () => {
      const { result, unmount, rerender } = renderHook(() => useWebSocket(), {
        wrapper: createWrapper(),
      });

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // Unmount component
      unmount();

      // Remount with same wrapper
      const { result: newResult } = renderHook(() => useWebSocket(), {
        wrapper: createWrapper(),
      });

      // Should reconnect
      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(newResult.current.isConnected).toBe(true);
      });
    });
  });

  describe('Message Handling', () => {
    it('handles multiple message types concurrently', async () => {
      const onMetricsUpdate = jest.fn();
      const onSessionUpdate = jest.fn();
      
      const { result } = renderHook(() => 
        useWebSocket({ onMetricsUpdate, onSessionUpdate }),
        { wrapper: createWrapper() }
      );

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // Send multiple messages rapidly
      const messages = [
        {
          type: 'METRICS_UPDATE',
          payload: { ...mockDashboardMetrics, activeUsers: 100 },
          timestamp: new Date().toISOString(),
        },
        {
          type: 'SESSION_UPDATE',
          payload: mockSessions[0],
          timestamp: new Date().toISOString(),
        },
        {
          type: 'ANALYTICS_EVENT',
          payload: { eventType: 'BOOKING_COMPLETED' },
          timestamp: new Date().toISOString(),
        },
      ];

      messages.forEach(message => {
        act(() => {
          IntegrationMockWebSocket.queueMessage(message);
        });
      });

      await waitFor(() => {
        expect(onMetricsUpdate).toHaveBeenCalledWith(messages[0].payload);
        expect(onSessionUpdate).toHaveBeenCalledWith(messages[1].payload);
      });
    });

    it('maintains message order under high throughput', async () => {
      const messageHandler = jest.fn();
      
      const { result } = renderHook(() => 
        useWebSocket({ onMessage: messageHandler }),
        { wrapper: createWrapper() }
      );

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // Send 100 messages rapidly
      const messages = Array.from({ length: 100 }, (_, i) => ({
        type: 'TEST_MESSAGE',
        payload: { sequence: i },
        timestamp: new Date().toISOString(),
      }));

      messages.forEach(message => {
        act(() => {
          IntegrationMockWebSocket.queueMessage(message);
        });
      });

      await waitFor(() => {
        expect(messageHandler).toHaveBeenCalledTimes(100);
      });

      // Verify message order
      const receivedSequences = messageHandler.mock.calls.map(call => call[0].payload.sequence);
      const expectedSequences = Array.from({ length: 100 }, (_, i) => i);
      expect(receivedSequences).toEqual(expectedSequences);
    });

    it('handles malformed messages gracefully', async () => {
      const { result } = renderHook(() => useWebSocket(), {
        wrapper: createWrapper(),
      });

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // Send malformed JSON
      const wsInstance = IntegrationMockWebSocket.instances[0];
      act(() => {
        wsInstance.onmessage?.(new MessageEvent('message', { data: 'invalid json' }));
      });

      // Should not crash and should continue processing valid messages
      act(() => {
        IntegrationMockWebSocket.queueMessage({
          type: 'VALID_MESSAGE',
          payload: { test: true },
          timestamp: new Date().toISOString(),
        });
      });

      await waitFor(() => {
        expect(result.current.lastMessage?.type).toBe('VALID_MESSAGE');
      });
    });
  });

  describe('Live Events Integration', () => {
    it('coordinates between WebSocket and live events hooks', async () => {
      const { result: wsResult } = renderHook(() => useWebSocket(), {
        wrapper: createWrapper(),
      });

      const { result: eventsResult } = renderHook(() => useLiveEvents(), {
        wrapper: createWrapper(),
      });

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(wsResult.current.isConnected).toBe(true);
        expect(eventsResult.current.isConnected).toBe(true);
      });

      // Send event message
      const eventMessage = {
        type: 'ANALYTICS_EVENT',
        payload: {
          eventId: 'evt_integration_001',
          sessionId: 'sess_integration_001',
          eventType: 'PAGE_VIEW',
          timestamp: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      };

      act(() => {
        IntegrationMockWebSocket.queueMessage(eventMessage);
      });

      await waitFor(() => {
        expect(eventsResult.current.events).toHaveLength(1);
        expect(eventsResult.current.events[0]).toEqual(eventMessage);
        expect(eventsResult.current.eventCount).toBe(1);
      });
    });

    it('handles event filtering and aggregation', async () => {
      const { result } = renderHook(() => 
        useLiveEvents({ 
          filterByType: ['SESSION_UPDATE', 'METRICS_UPDATE'],
          maxEvents: 5,
        }),
        { wrapper: createWrapper() }
      );

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // Send mixed event types
      const events = [
        { type: 'SESSION_UPDATE', payload: {}, timestamp: new Date().toISOString() },
        { type: 'ANALYTICS_EVENT', payload: {}, timestamp: new Date().toISOString() },
        { type: 'METRICS_UPDATE', payload: {}, timestamp: new Date().toISOString() },
        { type: 'USER_ACTION', payload: {}, timestamp: new Date().toISOString() },
        { type: 'SESSION_UPDATE', payload: {}, timestamp: new Date().toISOString() },
      ];

      events.forEach(event => {
        act(() => {
          IntegrationMockWebSocket.queueMessage(event);
        });
      });

      await waitFor(() => {
        // Should only have filtered events (SESSION_UPDATE and METRICS_UPDATE)
        expect(result.current.events).toHaveLength(3);
        expect(result.current.events.every(e => 
          e.type === 'SESSION_UPDATE' || e.type === 'METRICS_UPDATE'
        )).toBe(true);
      });
    });
  });

  describe('Performance and Reliability', () => {
    it('handles high-frequency updates without memory leaks', async () => {
      const { result } = renderHook(() => 
        useLiveEvents({ maxEvents: 10 }),
        { wrapper: createWrapper() }
      );

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // Send 100 events rapidly
      for (let i = 0; i < 100; i++) {
        act(() => {
          IntegrationMockWebSocket.queueMessage({
            type: 'HIGH_FREQUENCY_EVENT',
            payload: { id: i },
            timestamp: new Date().toISOString(),
          });
        });
      }

      await waitFor(() => {
        // Should maintain max events limit
        expect(result.current.events.length).toBeLessThanOrEqual(10);
        expect(result.current.eventCount).toBe(100);
      });
    });

    it('recovers gracefully from network interruptions', async () => {
      const { result } = renderHook(() => useWebSocket(), {
        wrapper: createWrapper(),
      });

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // Simulate network interruption
      act(() => {
        IntegrationMockWebSocket.simulateNetworkIssue();
      });

      await waitFor(() => {
        expect(result.current.connectionState).toBe('error');
      });

      // Fast-forward to trigger reconnection
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      // Should recover connection
      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // Should be able to send/receive messages again
      act(() => {
        result.current.sendMessage({ type: 'TEST_RECOVERY' });
      });

      const messageHistory = IntegrationMockWebSocket.getMessageHistory();
      expect(messageHistory.some(m => m.data.type === 'TEST_RECOVERY')).toBe(true);
    });

    it('handles concurrent connection attempts safely', async () => {
      // Create multiple hooks simultaneously
      const hooks = Array.from({ length: 5 }, () =>
        renderHook(() => useWebSocket(), { wrapper: createWrapper() })
      );

      act(() => {
        jest.advanceTimersByTime(100);
      });

      // All hooks should eventually connect
      await Promise.all(
        hooks.map(({ result }) =>
          waitFor(() => {
            expect(result.current.isConnected).toBe(true);
          })
        )
      );

      // Should not create excessive WebSocket instances
      expect(IntegrationMockWebSocket.instances.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Message Subscription Management', () => {
    it('handles subscription lifecycle correctly', async () => {
      const { result } = renderHook(() => useWebSocket(), {
        wrapper: createWrapper(),
      });

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // Subscribe to metrics
      act(() => {
        result.current.sendMessage({ type: 'SUBSCRIBE_METRICS' });
      });

      await waitFor(() => {
        expect(result.current.lastMessage?.type).toBe('SUBSCRIPTION_CONFIRMED');
      });

      // Send metrics update
      act(() => {
        IntegrationMockWebSocket.queueMessage({
          type: 'METRICS_UPDATE',
          payload: { activeUsers: 150 },
          timestamp: new Date().toISOString(),
        });
      });

      await waitFor(() => {
        expect(result.current.lastMessage?.type).toBe('METRICS_UPDATE');
        expect(result.current.lastMessage?.payload.activeUsers).toBe(150);
      });

      // Unsubscribe
      act(() => {
        result.current.sendMessage({ type: 'UNSUBSCRIBE_METRICS' });
      });

      // Future metrics updates should not be received
      // This would depend on your specific implementation
    });

    it('manages multiple subscriptions independently', async () => {
      const metricsHandler = jest.fn();
      const sessionsHandler = jest.fn();

      const { result } = renderHook(() => 
        useWebSocket({ 
          onMetricsUpdate: metricsHandler,
          onSessionUpdate: sessionsHandler,
        }),
        { wrapper: createWrapper() }
      );

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // Subscribe to both metrics and sessions
      act(() => {
        result.current.sendMessage({ type: 'SUBSCRIBE_METRICS' });
        result.current.sendMessage({ type: 'SUBSCRIBE_SESSIONS' });
      });

      // Send updates for both
      act(() => {
        IntegrationMockWebSocket.queueMessage({
          type: 'METRICS_UPDATE',
          payload: { activeUsers: 200 },
          timestamp: new Date().toISOString(),
        });

        IntegrationMockWebSocket.queueMessage({
          type: 'SESSION_UPDATE',
          payload: { sessionId: 'test_session' },
          timestamp: new Date().toISOString(),
        });
      });

      await waitFor(() => {
        expect(metricsHandler).toHaveBeenCalledWith({ activeUsers: 200 });
        expect(sessionsHandler).toHaveBeenCalledWith({ sessionId: 'test_session' });
      });
    });
  });

  describe('Error Scenarios', () => {
    it('handles WebSocket protocol errors', async () => {
      const { result } = renderHook(() => useWebSocket(), {
        wrapper: createWrapper(),
      });

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // Simulate protocol error
      const wsInstance = IntegrationMockWebSocket.instances[0];
      act(() => {
        wsInstance.onerror?.(new Event('error'));
      });

      expect(result.current.connectionState).toBe('error');
    });

    it('handles server-initiated connection close', async () => {
      const { result } = renderHook(() => useWebSocket(), {
        wrapper: createWrapper(),
      });

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // Simulate server closing connection
      const wsInstance = IntegrationMockWebSocket.instances[0];
      act(() => {
        wsInstance.close(1000, 'Normal closure');
      });

      await waitFor(() => {
        expect(result.current.connectionState).toBe('closed');
      });

      // Should attempt to reconnect
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });
    });
  });
});