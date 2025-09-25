import { render, screen, waitFor, fireEvent } from '../setup/testUtils';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import AnalyticsDashboard from '../../src/pages/AnalyticsDashboard';
import { WebSocketProvider } from '../../src/contexts/WebSocketContext';
import { TimeFilterProvider } from '../../src/contexts/TimeFilterContext';
import { setupMockServer, teardownMockServer } from '../mocks/mockServer';
import { mockAnalyticsDashboardMetrics, mockSessions } from '../fixtures/mockData';

// Mock Service Worker setup
import { setupServer } from 'msw/node';
import { http } from 'msw';

const handlers = [
  http.get('/api/v1/analytics/dashboard', () => {
    return Response.json(mockAnalyticsDashboardMetrics);
  }),
  http.get('/api/v1/analytics/sessions', () => {
    return Response.json({
      sessions: mockSessions,
      total: mockSessions.length,
      page: 1,
      limit: 10,
    });
  }),
  http.get('/health', () => {
    return Response.json({ status: 'healthy' });
  }),
];

const mockServer = setupServer(...handlers);

// Mock WebSocket for integration tests
class MockWebSocket {
  static instances: MockWebSocket[] = [];
  
  url: string;
  readyState: number = WebSocket.OPEN;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
    setTimeout(() => this.onopen?.(new Event('open')), 0);
  }

  send(data: string) {}
  close() {
    this.readyState = WebSocket.CLOSED;
    this.onclose?.(new CloseEvent('close'));
  }

  static simulateMessage(message: any) {
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

const createTestWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <TimeFilterProvider>
          <WebSocketProvider url="ws://localhost:3003">
            {children}
          </WebSocketProvider>
        </TimeFilterProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('AnalyticsDashboard Integration Tests', () => {
  beforeAll(() => {
    mockServer.listen({ onUnhandledRequest: 'error' });
  });

  afterAll(() => {
    mockServer.close();
  });

  beforeEach(() => {
    mockServer.resetHandlers();
    MockWebSocket.clear();
  });

  afterEach(() => {
    MockWebSocket.clear();
  });

  it('loads and displays dashboard with all components', async () => {
    const TestWrapper = createTestWrapper();
    
    render(<AnalyticsDashboard />, { wrapper: TestWrapper });

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByTestId('dashboard-loading')).not.toBeInTheDocument();
    });

    // Verify main dashboard components are rendered
    expect(screen.getByText('Real-Time Analytics Dashboard')).toBeInTheDocument();
    
    // Check TopStatsPanel
    expect(screen.getByText('Active Users')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('Total Searches')).toBeInTheDocument();
    expect(screen.getByText('1.6K')).toBeInTheDocument();

    // Check FunnelChart
    expect(screen.getByText('Booking Funnel')).toBeInTheDocument();
    expect(screen.getByText('Visitors')).toBeInTheDocument();
    expect(screen.getByText('Confirmation')).toBeInTheDocument();

    // Check SessionRecordsTable
    expect(screen.getByText('Recent Sessions')).toBeInTheDocument();
    expect(screen.getByText('sess_test_001')).toBeInTheDocument();
    expect(screen.getByText('The Ballard Inn & Restaurant')).toBeInTheDocument();

    // Check HeatmapCalendar
    expect(screen.getByText('Activity Heatmap')).toBeInTheDocument();
  });

  it('handles time filter changes across all components', async () => {
    const TestWrapper = createTestWrapper();
    
    render(<AnalyticsDashboard />, { wrapper: TestWrapper });

    await waitFor(() => {
      expect(screen.queryByTestId('dashboard-loading')).not.toBeInTheDocument();
    });

    // Change time filter
    const timeFilter = screen.getByDisplayValue('Last 24 Hours');
    fireEvent.mouseDown(timeFilter);
    
    const option7d = screen.getByText('Last 7 Days');
    fireEvent.click(option7d);

    // Verify API is called with new time range
    await waitFor(() => {
      expect(screen.getByDisplayValue('Last 7 Days')).toBeInTheDocument();
    });

    // Components should update with new data
    // This would require different mock data for 7d vs 24h
  });

  it('handles real-time WebSocket updates', async () => {
    const TestWrapper = createTestWrapper();
    
    render(<AnalyticsDashboard />, { wrapper: TestWrapper });

    await waitFor(() => {
      expect(screen.queryByTestId('dashboard-loading')).not.toBeInTheDocument();
    });

    // Simulate WebSocket message
    const liveUpdate = {
      type: 'analytics.metrics.updated',
      payload: {
        ...mockAnalyticsDashboardMetrics,
        activeUsers: 55, // Updated value
      },
      timestamp: new Date().toISOString(),
    };

    MockWebSocket.simulateMessage(liveUpdate);

    // Wait for UI to update
    await waitFor(() => {
      expect(screen.getByText('55')).toBeInTheDocument();
    });

    // Verify connection indicator shows "Live Connected"
    expect(screen.getByText('Live Connected')).toBeInTheDocument();
  });

  it('handles session updates in real-time', async () => {
    const TestWrapper = createTestWrapper();
    
    render(<AnalyticsDashboard />, { wrapper: TestWrapper });

    await waitFor(() => {
      expect(screen.queryByTestId('dashboard-loading')).not.toBeInTheDocument();
    });

    // Simulate new session creation
    const newSession = {
      type: 'session.updated',
      payload: {
        sessionId: 'sess_new_001',
        userId: 'user_new_001',
        hotel: 'New Test Hotel',
        destination: 'New Destination',
        status: 'LIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        currentStage: 1,
        completedStages: ['destination'],
      },
      timestamp: new Date().toISOString(),
    };

    MockWebSocket.simulateMessage(newSession);

    // New session should appear in the table
    await waitFor(() => {
      expect(screen.getByText('sess_new_001')).toBeInTheDocument();
      expect(screen.getByText('New Test Hotel')).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    // Mock API error
    mockServer.use(
      http.get('/api/v1/analytics/dashboard', (req, res, ctx) => {
        return res(ctx.status(500), ctx.json({ message: 'Internal server error' }));
      })
    );

    const TestWrapper = createTestWrapper();
    
    render(<AnalyticsDashboard />, { wrapper: TestWrapper });

    // Error state should be displayed
    await waitFor(() => {
      expect(screen.getByText('Failed to load dashboard data')).toBeInTheDocument();
    });

    // Retry button should be available
    expect(screen.getByText('Try again')).toBeInTheDocument();
  });

  it('handles network disconnection and reconnection', async () => {
    const TestWrapper = createTestWrapper();
    
    render(<AnalyticsDashboard />, { wrapper: TestWrapper });

    await waitFor(() => {
      expect(screen.queryByTestId('dashboard-loading')).not.toBeInTheDocument();
    });

    // Initially connected
    expect(screen.getByText('LIVE')).toBeInTheDocument();

    // Simulate connection loss
    const wsInstance = MockWebSocket.instances[0];
    wsInstance.readyState = WebSocket.CLOSED;
    wsInstance.onclose?.(new CloseEvent('close'));

    // Should show disconnected state
    await waitFor(() => {
      expect(screen.getByText('OFFLINE')).toBeInTheDocument();
    });

    // Simulate reconnection
    MockWebSocket.simulateMessage({
      type: 'CONNECTION_ESTABLISHED',
      payload: { sessionId: 'reconnected-session' },
      timestamp: new Date().toISOString(),
    });

    // Should return to connected state
    await waitFor(() => {
      expect(screen.getByText('LIVE')).toBeInTheDocument();
    });
  });

  it('handles component interaction workflows', async () => {
    const TestWrapper = createTestWrapper();
    
    render(<AnalyticsDashboard />, { wrapper: TestWrapper });

    await waitFor(() => {
      expect(screen.queryByTestId('dashboard-loading')).not.toBeInTheDocument();
    });

    // Click on a session in the table
    const viewButton = screen.getAllByText('View')[0];
    fireEvent.click(viewButton);

    // Should trigger session detail view or modal
    // Implementation depends on your specific UI behavior
  });

  it('maintains performance with large datasets', async () => {
    // Mock large dataset
    const largeSessions = Array.from({ length: 100 }, (_, i) => ({
      ...mockSessions[0],
      sessionId: `sess_large_${i}`,
    }));

    mockServer.use(
      http.get('/api/v1/analytics/sessions', (req, res, ctx) => {
        return res(ctx.json({
          sessions: largeSessions,
          total: largeSessions.length,
          page: 1,
          limit: 100,
        }));
      })
    );

    const TestWrapper = createTestWrapper();
    
    const startTime = Date.now();
    render(<AnalyticsDashboard />, { wrapper: TestWrapper });

    await waitFor(() => {
      expect(screen.queryByTestId('dashboard-loading')).not.toBeInTheDocument();
    });

    const endTime = Date.now();
    const renderTime = endTime - startTime;

    // Should render within reasonable time (adjust threshold as needed)
    expect(renderTime).toBeLessThan(3000);

    // Should handle pagination
    expect(screen.getByText('1-10 of 100')).toBeInTheDocument();
  });

  it('handles concurrent data updates', async () => {
    const TestWrapper = createTestWrapper();
    
    render(<AnalyticsDashboard />, { wrapper: TestWrapper });

    await waitFor(() => {
      expect(screen.queryByTestId('dashboard-loading')).not.toBeInTheDocument();
    });

    // Simulate multiple concurrent WebSocket messages
    const updates = [
      {
        type: 'METRICS_UPDATE',
        payload: { ...mockAnalyticsDashboardMetrics, activeUsers: 60 },
        timestamp: new Date().toISOString(),
      },
      {
        type: 'SESSION_UPDATE',
        payload: mockSessions[0],
        timestamp: new Date().toISOString(),
      },
      {
        type: 'ANALYTICS_EVENT',
        payload: { eventType: 'BOOKING_COMPLETED', timestamp: new Date().toISOString() },
        timestamp: new Date().toISOString(),
      },
    ];

    // Send all updates rapidly
    updates.forEach((update, index) => {
      setTimeout(() => MockWebSocket.simulateMessage(update), index * 10);
    });

    // Should handle all updates without crashing
    await waitFor(() => {
      expect(screen.getByText('60')).toBeInTheDocument();
    }, { timeout: 1000 });
  });

  it('preserves user interactions during data updates', async () => {
    const TestWrapper = createTestWrapper();
    
    render(<AnalyticsDashboard />, { wrapper: TestWrapper });

    await waitFor(() => {
      expect(screen.queryByTestId('dashboard-loading')).not.toBeInTheDocument();
    });

    // User opens time filter dropdown
    const timeFilter = screen.getByDisplayValue('Last 24 Hours');
    fireEvent.mouseDown(timeFilter);

    // Dropdown should be open
    expect(screen.getByText('Last 7 Days')).toBeInTheDocument();

    // Simulate data update while dropdown is open
    MockWebSocket.simulateMessage({
      type: 'METRICS_UPDATE',
      payload: { ...mockAnalyticsDashboardMetrics, activeUsers: 70 },
      timestamp: new Date().toISOString(),
    });

    // Dropdown should remain open
    await waitFor(() => {
      expect(screen.getByText('Last 7 Days')).toBeInTheDocument();
      expect(screen.getByText('70')).toBeInTheDocument();
    });
  });

  it('handles responsive layout changes', async () => {
    const TestWrapper = createTestWrapper();
    
    // Mock mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });

    render(<AnalyticsDashboard />, { wrapper: TestWrapper });

    await waitFor(() => {
      expect(screen.queryByTestId('dashboard-loading')).not.toBeInTheDocument();
    });

    // Components should adapt to mobile layout
    // This would depend on your specific responsive implementation
    const dashboard = screen.getByTestId('dashboard-container');
    expect(dashboard).toBeInTheDocument();

    // Restore original viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });
  });
});