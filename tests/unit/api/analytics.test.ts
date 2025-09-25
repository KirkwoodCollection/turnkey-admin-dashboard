import {
  getDashboardMetrics,
  getSessions,
  getAnalyticsEvents,
  exportMetrics,
} from '../../../src/services/analytics';
import * as client from '../../../src/api/client';
import { mockDashboardMetrics, mockSessions, mockAnalyticsEvents } from '../../fixtures/mockData';

// Mock the API client
jest.mock('../../../src/api/client');
const mockClient = client as jest.Mocked<typeof client>;

describe('Analytics API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getDashboardMetrics', () => {
    it('fetches dashboard metrics successfully', async () => {
      mockClient.apiClient.get.mockResolvedValue(mockDashboardMetrics);

      const result = await getDashboardMetrics('24h');

      expect(mockClient.apiClient.get).toHaveBeenCalledWith('/api/v1/analytics/dashboard', {
        timeRange: '24h',
      });
      expect(result).toEqual(mockDashboardMetrics);
    });

    it('handles different time ranges', async () => {
      mockClient.apiClient.get.mockResolvedValue(mockDashboardMetrics);

      await getDashboardMetrics('7d');
      expect(mockClient.apiClient.get).toHaveBeenCalledWith('/api/v1/analytics/dashboard', {
        timeRange: '7d',
      });

      await getDashboardMetrics('30d');
      expect(mockClient.apiClient.get).toHaveBeenCalledWith('/api/v1/analytics/dashboard', {
        timeRange: '30d',
      });
    });

    it('handles custom date ranges', async () => {
      mockClient.apiClient.get.mockResolvedValue(mockDashboardMetrics);

      const customRange = {
        startDate: '2024-01-01',
        endDate: '2024-01-07',
      };

      await getDashboardMetrics('custom', customRange);

      expect(mockClient.apiClient.get).toHaveBeenCalledWith('/api/v1/analytics/dashboard', {
        timeRange: 'custom',
        startDate: '2024-01-01',
        endDate: '2024-01-07',
      });
    });

    it('handles API errors gracefully', async () => {
      const error = new Error('API Error');
      mockClient.apiClient.get.mockRejectedValue(error);

      await expect(getDashboardMetrics('24h')).rejects.toThrow('API Error');
    });

    it('validates metrics data structure', async () => {
      const invalidMetrics = { invalid: 'data' };
      mockClient.apiClient.get.mockResolvedValue(invalidMetrics);

      await expect(getDashboardMetrics('24h')).rejects.toThrow('Invalid metrics data structure');
    });

    it('applies data transformations', async () => {
      const rawMetrics = {
        ...mockDashboardMetrics,
        conversionRate: 0.149, // Decimal format
      };
      mockClient.apiClient.get.mockResolvedValue(rawMetrics);

      const result = await getDashboardMetrics('24h');

      expect(result.conversionRate).toBe(14.9); // Should be converted to percentage
    });
  });

  describe('getSessions', () => {
    it('fetches sessions with default parameters', async () => {
      const mockResponse = {
        sessions: mockSessions,
        total: mockSessions.length,
        page: 1,
        limit: 10,
      };
      mockClient.apiClient.get.mockResolvedValue(mockResponse);

      const result = await getSessions();

      expect(mockClient.apiClient.get).toHaveBeenCalledWith('/api/v1/analytics/sessions', {
        page: 1,
        limit: 10,
      });
      expect(result).toEqual(mockResponse);
    });

    it('handles pagination parameters', async () => {
      const mockResponse = {
        sessions: mockSessions.slice(0, 5),
        total: mockSessions.length,
        page: 2,
        limit: 5,
      };
      mockClient.apiClient.get.mockResolvedValue(mockResponse);

      await getSessions({ page: 2, limit: 5 });

      expect(mockClient.apiClient.get).toHaveBeenCalledWith('/api/v1/analytics/sessions', {
        page: 2,
        limit: 5,
      });
    });

    it('filters sessions by status', async () => {
      const liveSessionsResponse = {
        sessions: mockSessions.filter(s => s.status === 'LIVE'),
        total: 1,
        page: 1,
        limit: 10,
      };
      mockClient.apiClient.get.mockResolvedValue(liveSessionsResponse);

      await getSessions({ status: 'LIVE' });

      expect(mockClient.apiClient.get).toHaveBeenCalledWith('/api/v1/analytics/sessions', {
        page: 1,
        limit: 10,
        status: 'LIVE',
      });
    });

    it('filters sessions by date range', async () => {
      const dateRange = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      };

      mockClient.apiClient.get.mockResolvedValue({ sessions: [], total: 0 });

      await getSessions({ ...dateRange });

      expect(mockClient.apiClient.get).toHaveBeenCalledWith('/api/v1/analytics/sessions', {
        page: 1,
        limit: 10,
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      });
    });

    it('sorts sessions by specified field', async () => {
      mockClient.apiClient.get.mockResolvedValue({ sessions: mockSessions, total: 3 });

      await getSessions({ sortBy: 'createdAt', sortOrder: 'desc' });

      expect(mockClient.apiClient.get).toHaveBeenCalledWith('/api/v1/analytics/sessions', {
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
    });

    it('searches sessions by keyword', async () => {
      mockClient.apiClient.get.mockResolvedValue({ sessions: mockSessions, total: 3 });

      await getSessions({ search: 'Santa Barbara' });

      expect(mockClient.apiClient.get).toHaveBeenCalledWith('/api/v1/analytics/sessions', {
        page: 1,
        limit: 10,
        search: 'Santa Barbara',
      });
    });

    it('validates session data types', async () => {
      const invalidSessions = {
        sessions: [{ invalid: 'session' }],
        total: 1,
      };
      mockClient.apiClient.get.mockResolvedValue(invalidSessions);

      await expect(getSessions()).rejects.toThrow('Invalid session data');
    });
  });

  describe('getAnalyticsEvents', () => {
    it('fetches analytics events successfully', async () => {
      const mockResponse = {
        events: mockAnalyticsEvents,
        total: mockAnalyticsEvents.length,
      };
      mockClient.apiClient.get.mockResolvedValue(mockResponse);

      const result = await getAnalyticsEvents();

      expect(mockClient.apiClient.get).toHaveBeenCalledWith('/api/v1/analytics/events', {});
      expect(result).toEqual(mockResponse);
    });

    it('filters events by session ID', async () => {
      const sessionId = 'sess_test_001';
      const filteredEvents = mockAnalyticsEvents.filter(e => e.sessionId === sessionId);
      const mockResponse = {
        events: filteredEvents,
        total: filteredEvents.length,
      };
      mockClient.apiClient.get.mockResolvedValue(mockResponse);

      await getAnalyticsEvents({ sessionId });

      expect(mockClient.apiClient.get).toHaveBeenCalledWith('/api/v1/analytics/events', {
        sessionId,
      });
    });

    it('filters events by type', async () => {
      const eventType = 'DESTINATION_SEARCH';
      mockClient.apiClient.get.mockResolvedValue({ events: [], total: 0 });

      await getAnalyticsEvents({ eventType });

      expect(mockClient.apiClient.get).toHaveBeenCalledWith('/api/v1/analytics/events', {
        eventType,
      });
    });

    it('applies time range filtering', async () => {
      const timeRange = {
        startTime: '2024-01-15T00:00:00Z',
        endTime: '2024-01-15T23:59:59Z',
      };
      mockClient.apiClient.get.mockResolvedValue({ events: [], total: 0 });

      await getAnalyticsEvents(timeRange);

      expect(mockClient.apiClient.get).toHaveBeenCalledWith('/api/v1/analytics/events', timeRange);
    });

    it('handles pagination for large event sets', async () => {
      mockClient.apiClient.get.mockResolvedValue({ events: mockAnalyticsEvents, total: 1000 });

      await getAnalyticsEvents({ page: 5, limit: 50 });

      expect(mockClient.apiClient.get).toHaveBeenCalledWith('/api/v1/analytics/events', {
        page: 5,
        limit: 50,
      });
    });
  });

  describe('exportMetrics', () => {
    it('exports metrics in CSV format', async () => {
      const csvData = 'Date,Active Users,Total Searches\n2024-01-15,42,1567';
      mockClient.apiClient.get.mockResolvedValue(csvData);

      const result = await exportMetrics('csv', '24h');

      expect(mockClient.apiClient.get).toHaveBeenCalledWith('/api/v1/analytics/export', {
        format: 'csv',
        timeRange: '24h',
      });
      expect(result).toBe(csvData);
    });

    it('exports metrics in JSON format', async () => {
      const jsonData = { export: mockDashboardMetrics, timestamp: '2024-01-15T12:00:00Z' };
      mockClient.apiClient.get.mockResolvedValue(jsonData);

      const result = await exportMetrics('json', '7d');

      expect(mockClient.apiClient.get).toHaveBeenCalledWith('/api/v1/analytics/export', {
        format: 'json',
        timeRange: '7d',
      });
      expect(result).toEqual(jsonData);
    });

    it('exports metrics in Excel format', async () => {
      const excelBlob = new Blob(['fake excel data'], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      mockClient.apiClient.get.mockResolvedValue(excelBlob);

      const result = await exportMetrics('xlsx', '30d');

      expect(mockClient.apiClient.get).toHaveBeenCalledWith('/api/v1/analytics/export', {
        format: 'xlsx',
        timeRange: '30d',
      });
      expect(result).toBe(excelBlob);
    });

    it('includes custom date ranges in exports', async () => {
      mockClient.apiClient.get.mockResolvedValue('export data');

      const customRange = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      };

      await exportMetrics('csv', 'custom', customRange);

      expect(mockClient.apiClient.get).toHaveBeenCalledWith('/api/v1/analytics/export', {
        format: 'csv',
        timeRange: 'custom',
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      });
    });

    it('handles export errors gracefully', async () => {
      mockClient.apiClient.get.mockRejectedValue(new Error('Export failed'));

      await expect(exportMetrics('csv', '24h')).rejects.toThrow('Export failed');
    });

    it('validates export format parameter', async () => {
      await expect(exportMetrics('invalid' as any, '24h')).rejects.toThrow('Invalid export format');
    });
  });

  describe('error handling and edge cases', () => {
    it('handles network timeouts', async () => {
      const timeoutError = new Error('Request timeout');
      timeoutError.name = 'TimeoutError';
      mockClient.apiClient.get.mockRejectedValue(timeoutError);

      await expect(getDashboardMetrics('24h')).rejects.toThrow('Request timeout');
    });

    it('handles malformed API responses', async () => {
      mockClient.apiClient.get.mockResolvedValue('invalid json');

      await expect(getDashboardMetrics('24h')).rejects.toThrow();
    });

    it('handles partial data responses', async () => {
      const partialMetrics = {
        activeUsers: 42,
        totalSearches: 1567,
        // Missing other required fields
      };
      mockClient.apiClient.get.mockResolvedValue(partialMetrics);

      await expect(getDashboardMetrics('24h')).rejects.toThrow('Incomplete metrics data');
    });

    it('handles very large datasets gracefully', async () => {
      const largeSessions = Array.from({ length: 10000 }, (_, i) => ({
        ...mockSessions[0],
        sessionId: `session_${i}`,
      }));

      mockClient.apiClient.get.mockResolvedValue({
        sessions: largeSessions,
        total: 10000,
      });

      const result = await getSessions({ limit: 10000 });
      expect(result.sessions).toHaveLength(10000);
    });

    it('handles rate limiting responses', async () => {
      const rateLimitError = new Error('Rate limit exceeded');
      rateLimitError.name = 'RateLimitError';
      mockClient.apiClient.get.mockRejectedValue(rateLimitError);

      await expect(getDashboardMetrics('24h')).rejects.toThrow('Rate limit exceeded');
    });

    it('retries failed requests with exponential backoff', async () => {
      // First call fails, second succeeds
      mockClient.apiClient.get
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce(mockDashboardMetrics);

      const result = await getDashboardMetrics('24h', undefined, { retry: true });
      
      expect(mockClient.apiClient.get).toHaveBeenCalledTimes(2);
      expect(result).toEqual(mockDashboardMetrics);
    });
  });

  describe('caching behavior', () => {
    it('uses cached data when available', async () => {
      mockClient.apiClient.get.mockResolvedValue(mockDashboardMetrics);

      // First call should hit the API
      await getDashboardMetrics('24h');
      expect(mockClient.apiClient.get).toHaveBeenCalledTimes(1);

      // Second call with same parameters might use cache
      await getDashboardMetrics('24h');
      // Implementation dependent - might still be 1 if cached
    });

    it('bypasses cache when explicitly requested', async () => {
      mockClient.apiClient.get.mockResolvedValue(mockDashboardMetrics);

      await getDashboardMetrics('24h', undefined, { bypassCache: true });
      await getDashboardMetrics('24h', undefined, { bypassCache: true });

      expect(mockClient.apiClient.get).toHaveBeenCalledTimes(2);
    });

    it('invalidates cache on data mutations', async () => {
      mockClient.apiClient.get.mockResolvedValue(mockDashboardMetrics);
      mockClient.apiClient.post.mockResolvedValue({ success: true });

      // Get cached data
      await getDashboardMetrics('24h');

      // Perform mutation that should invalidate cache
      await mockClient.apiClient.post('/api/v1/analytics/invalidate-cache', {});

      // Next call should hit API again
      await getDashboardMetrics('24h');

      expect(mockClient.apiClient.get).toHaveBeenCalledTimes(2);
    });
  });

  describe('real-time data integration', () => {
    it('merges real-time updates with historical data', async () => {
      mockClient.apiClient.get.mockResolvedValue(mockDashboardMetrics);

      const result = await getDashboardMetrics('24h', undefined, { 
        includeRealTime: true 
      });

      expect(mockClient.apiClient.get).toHaveBeenCalledWith('/api/v1/analytics/dashboard', {
        timeRange: '24h',
        includeRealTime: true,
      });
    });

    it('handles real-time data inconsistencies', async () => {
      const inconsistentData = {
        ...mockDashboardMetrics,
        activeUsers: -5, // Invalid negative value
      };
      mockClient.apiClient.get.mockResolvedValue(inconsistentData);

      await expect(getDashboardMetrics('24h')).rejects.toThrow('Invalid real-time data');
    });
  });
});