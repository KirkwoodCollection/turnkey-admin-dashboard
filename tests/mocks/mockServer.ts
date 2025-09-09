import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import { mockDashboardMetrics, mockSessions, mockAnalyticsEvents } from '../fixtures/mockData';
import testMetrics from '../fixtures/testMetrics.json' with { type: 'json' };
import testSessions from '../fixtures/testSessions.json' with { type: 'json' };

const REST_PORT = 3002;
const WS_PORT = 3003;

export interface MockServerInstance {
  restServer: any;
  wsServer: WebSocketServer;
  close: () => Promise<void>;
}

export function createMockServer(): MockServerInstance {
  const app = express();
  
  app.use(cors());
  app.use(express.json());

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  // Analytics endpoints
  app.get('/api/v1/analytics/dashboard', (req, res) => {
    const timeRange = req.query.timeRange as string;
    
    if (timeRange === 'test-fixture') {
      res.json(testMetrics);
    } else {
      res.json(mockDashboardMetrics);
    }
  });

  app.get('/api/v1/analytics/sessions', (req, res) => {
    const { status, limit = '10' } = req.query as { status?: string; limit?: string };
    
    let sessions = req.query.fixture === 'test' ? testSessions : mockSessions;
    
    if (status) {
      sessions = sessions.filter(s => s.status === status);
    }
    
    const limitNum = parseInt(limit as string, 10);
    const paginatedSessions = sessions.slice(0, limitNum);
    
    res.json({
      sessions: paginatedSessions,
      total: sessions.length,
      page: 1,
      limit: limitNum,
    });
  });

  app.get('/api/v1/analytics/events', (req, res) => {
    const { sessionId, eventType } = req.query as { sessionId?: string; eventType?: string };
    
    let events = mockAnalyticsEvents;
    
    if (sessionId) {
      events = events.filter(e => e.sessionId === sessionId);
    }
    
    if (eventType) {
      events = events.filter(e => e.eventType === eventType);
    }
    
    res.json({
      events,
      total: events.length,
    });
  });

  // Error simulation endpoints for testing error handling
  app.get('/api/v1/analytics/error/401', (req, res) => {
    res.status(401).json({
      message: 'Unauthorized access',
      code: 'UNAUTHORIZED',
    });
  });

  app.get('/api/v1/analytics/error/404', (req, res) => {
    res.status(404).json({
      message: 'Resource not found',
      code: 'NOT_FOUND',
    });
  });

  app.get('/api/v1/analytics/error/500', (req, res) => {
    res.status(500).json({
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
    });
  });

  // Slow endpoint for timeout testing
  app.get('/api/v1/analytics/slow', (req, res) => {
    const delay = parseInt(req.query.delay as string) || 5000;
    setTimeout(() => {
      res.json(mockDashboardMetrics);
    }, delay);
  });

  const httpServer = createServer(app);
  const restServer = httpServer.listen(REST_PORT);

  // WebSocket Server
  const wsServer = new WebSocketServer({ port: WS_PORT });
  const connectedClients = new Set<any>();

  wsServer.on('connection', (ws) => {
    connectedClients.add(ws);
    
    // Send connection confirmation
    ws.send(JSON.stringify({
      type: 'CONNECTION_ESTABLISHED',
      payload: { sessionId: `test-ws-session-${Date.now()}` },
      timestamp: new Date().toISOString(),
      id: `ws_msg_${Date.now()}`,
    }));

    // Simulate periodic metrics updates
    const metricsInterval = setInterval(() => {
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({
          type: 'METRICS_UPDATE',
          payload: {
            ...mockDashboardMetrics,
            activeUsers: mockDashboardMetrics.activeUsers + Math.floor(Math.random() * 5),
            timestamp: new Date().toISOString(),
          },
          timestamp: new Date().toISOString(),
          id: `ws_metrics_${Date.now()}`,
        }));
      }
    }, 2000);

    // Simulate session updates
    const sessionInterval = setInterval(() => {
      if (ws.readyState === ws.OPEN && mockSessions.length > 0) {
        const randomSession = mockSessions[Math.floor(Math.random() * mockSessions.length)];
        ws.send(JSON.stringify({
          type: 'SESSION_UPDATE',
          payload: randomSession,
          timestamp: new Date().toISOString(),
          id: `ws_session_${Date.now()}`,
        }));
      }
    }, 5000);

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        // Handle different message types
        switch (data.type) {
          case 'SUBSCRIBE_METRICS':
            ws.send(JSON.stringify({
              type: 'SUBSCRIPTION_CONFIRMED',
              payload: { subscription: 'metrics' },
              timestamp: new Date().toISOString(),
              id: `ws_sub_${Date.now()}`,
            }));
            break;
            
          case 'SUBSCRIBE_SESSIONS':
            ws.send(JSON.stringify({
              type: 'SUBSCRIPTION_CONFIRMED',
              payload: { subscription: 'sessions' },
              timestamp: new Date().toISOString(),
              id: `ws_sub_${Date.now()}`,
            }));
            break;
            
          default:
            ws.send(JSON.stringify({
              type: 'ERROR',
              payload: { message: 'Unknown message type' },
              timestamp: new Date().toISOString(),
              id: `ws_error_${Date.now()}`,
            }));
        }
      } catch (error) {
        ws.send(JSON.stringify({
          type: 'ERROR',
          payload: { message: 'Invalid JSON message' },
          timestamp: new Date().toISOString(),
          id: `ws_error_${Date.now()}`,
        }));
      }
    });

    ws.on('close', () => {
      connectedClients.delete(ws);
      clearInterval(metricsInterval);
      clearInterval(sessionInterval);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      connectedClients.delete(ws);
      clearInterval(metricsInterval);
      clearInterval(sessionInterval);
    });
  });

  // Broadcast method for testing
  const broadcast = (message: any) => {
    connectedClients.forEach((ws) => {
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify(message));
      }
    });
  };

  const close = (): Promise<void> => {
    return new Promise((resolve) => {
      let pending = 2;
      const checkDone = () => {
        pending--;
        if (pending === 0) resolve();
      };

      restServer.close(checkDone);
      wsServer.close(checkDone);
    });
  };

  return {
    restServer,
    wsServer,
    close,
    broadcast: broadcast as any,
  };
}

// Export for direct usage in tests
let serverInstance: MockServerInstance | null = null;

export const startMockServer = (): MockServerInstance => {
  if (serverInstance) {
    return serverInstance;
  }
  
  serverInstance = createMockServer();
  return serverInstance;
};

export const stopMockServer = async (): Promise<void> => {
  if (serverInstance) {
    await serverInstance.close();
    serverInstance = null;
  }
};

// For Jest global setup/teardown
export const setupMockServer = async (): Promise<void> => {
  startMockServer();
  await new Promise(resolve => setTimeout(resolve, 100));
};

export const teardownMockServer = async (): Promise<void> => {
  await stopMockServer();
};