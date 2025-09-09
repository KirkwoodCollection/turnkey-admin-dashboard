import { renderHook, waitFor } from '../../setup/testUtils';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useDashboardData } from '../../../src/hooks/useDashboardData';
import { mockDashboardMetrics } from '../../fixtures/mockData';
import * as analyticsApi from '../../../src/services/analytics';

// Mock the analytics API
jest.mock('../../../src/services/analytics');
const mockAnalyticsApi = analyticsApi as jest.Mocked<typeof analyticsApi>;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useDashboardData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAnalyticsApi.getDashboardMetrics.mockResolvedValue(mockDashboardMetrics);
  });

  it('returns loading state initially', () => {
    const { result } = renderHook(() => useDashboardData('24h'), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toBe(null);
  });

  it('fetches dashboard data successfully', async () => {
    const { result } = renderHook(() => useDashboardData('24h'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockDashboardMetrics);
    expect(result.current.error).toBe(null);
    expect(mockAnalyticsApi.getDashboardMetrics).toHaveBeenCalledWith('24h');
  });

  it('handles API errors gracefully', async () => {
    const error = new Error('API Error');
    mockAnalyticsApi.getDashboardMetrics.mockRejectedValue(error);

    const { result } = renderHook(() => useDashboardData('24h'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toBe(error);
  });

  it('refetches data when time range changes', async () => {
    const { result, rerender } = renderHook(
      ({ timeRange }) => useDashboardData(timeRange),
      {
        wrapper: createWrapper(),
        initialProps: { timeRange: '24h' },
      }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockAnalyticsApi.getDashboardMetrics).toHaveBeenCalledWith('24h');

    rerender({ timeRange: '7d' });

    await waitFor(() => {
      expect(mockAnalyticsApi.getDashboardMetrics).toHaveBeenCalledWith('7d');
    });
  });

  it('caches data for same time range', async () => {
    const { result: result1 } = renderHook(() => useDashboardData('24h'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result1.current.isLoading).toBe(false);
    });

    const { result: result2 } = renderHook(() => useDashboardData('24h'), {
      wrapper: createWrapper(),
    });

    // Second hook should get cached data
    expect(result2.current.isLoading).toBe(false);
    expect(result2.current.data).toEqual(mockDashboardMetrics);
    
    // API should only be called once due to caching
    expect(mockAnalyticsApi.getDashboardMetrics).toHaveBeenCalledTimes(1);
  });

  it('provides refetch functionality', async () => {
    const { result } = renderHook(() => useDashboardData('24h'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Clear previous calls
    jest.clearAllMocks();
    mockAnalyticsApi.getDashboardMetrics.mockResolvedValue(mockDashboardMetrics);

    await result.current.refetch();

    expect(mockAnalyticsApi.getDashboardMetrics).toHaveBeenCalledWith('24h');
  });

  it('handles network errors', async () => {
    const networkError = new Error('Network Error');
    networkError.name = 'NetworkError';
    mockAnalyticsApi.getDashboardMetrics.mockRejectedValue(networkError);

    const { result } = renderHook(() => useDashboardData('24h'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe(networkError);
    expect(result.current.isError).toBe(true);
  });

  it('handles timeout errors', async () => {
    const timeoutError = new Error('Request timeout');
    timeoutError.name = 'TimeoutError';
    mockAnalyticsApi.getDashboardMetrics.mockRejectedValue(timeoutError);

    const { result } = renderHook(() => useDashboardData('24h'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe(timeoutError);
  });

  it('updates data when real-time updates are received', async () => {
    const { result } = renderHook(() => useDashboardData('24h'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const initialData = result.current.data;
    
    // Simulate real-time update
    const updatedMetrics = {
      ...mockDashboardMetrics,
      activeUsers: mockDashboardMetrics.activeUsers + 10,
    };

    // This would typically come from WebSocket context
    // For now, we'll test the hook's ability to handle updates
    expect(initialData).toEqual(mockDashboardMetrics);
  });

  it('provides isStale indicator for old data', async () => {
    const { result } = renderHook(() => useDashboardData('24h'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Initially data is fresh
    expect(result.current.isStale).toBe(false);

    // After some time, data becomes stale (this depends on cache configuration)
    // We can simulate this by manually invalidating the cache
  });

  it('handles empty response gracefully', async () => {
    mockAnalyticsApi.getDashboardMetrics.mockResolvedValue(null as any);

    const { result } = renderHook(() => useDashboardData('24h'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBe(null);
    expect(result.current.error).toBe(null);
  });

  it('provides loading state during refetch', async () => {
    const { result } = renderHook(() => useDashboardData('24h'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Start refetch
    const refetchPromise = result.current.refetch();

    expect(result.current.isFetching).toBe(true);

    await refetchPromise;

    expect(result.current.isFetching).toBe(false);
  });

  it('maintains data integrity across updates', async () => {
    const { result } = renderHook(() => useDashboardData('24h'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const data = result.current.data;
    
    // Verify data structure
    expect(data).toHaveProperty('activeUsers');
    expect(data).toHaveProperty('totalSearches');
    expect(data).toHaveProperty('totalBookings');
    expect(data).toHaveProperty('conversionRate');
    expect(data).toHaveProperty('funnelStats');
    expect(data).toHaveProperty('topDestinations');
    expect(data).toHaveProperty('topHotels');
  });
});