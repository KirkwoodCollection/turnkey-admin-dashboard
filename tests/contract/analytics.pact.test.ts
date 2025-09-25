import { Pact, Interaction, Matchers } from '@pact-foundation/pact';
import { getDashboardMetrics, getSessions, exportMetrics } from '../../src/services/analytics';
import { apiClient } from '../../src/api/client';
import path from 'path';

const { like, eachLike, iso8601DateTime, term, integer } = Matchers;

describe('Analytics API Contract Tests', () => {
  const provider = new Pact({
    consumer: 'turnkey-admin-dashboard',
    provider: 'turnkey-analytics-api',
    port: 1234,
    log: path.resolve(process.cwd(), 'logs', 'pact.log'),
    dir: path.resolve(process.cwd(), 'pacts'),
    logLevel: 'info',
  });

  beforeAll(async () => {
    await provider.setup();
    
    // Configure API client to use Pact mock server
    process.env.VITE_API_BASE_URL = 'http://localhost:1234';
  });

  afterAll(async () => {
    await provider.finalize();
  });

  afterEach(async () => {
    await provider.verify();
  });

  describe('GET /api/v1/analytics/dashboard', () => {
    it('should return dashboard metrics for 24h time range', async () => {
      const expectedResponse = {
        activeUsers: like(42),
        totalSearches: like(1567),
        totalBookings: like(234),
        conversionRate: like(14.9),
        abandonmentRate: like(31.2),
        averageSessionDuration: like(342),
        averageLeadTime: like(12),
        topDestinations: eachLike({
          destination: like('Santa Barbara'),
          count: like(145),
          percentage: like(23.4),
        }, { min: 1 }),
        topHotels: eachLike({
          hotel: like('The Ballard Inn & Restaurant'),
          searches: like(234),
          bookings: like(34),
          conversionRate: like(14.5),
        }, { min: 1 }),
        funnelStats: eachLike({
          stage: like('Visitors'),
          count: like(1000),
          percentage: like(100.0),
          dropOffRate: like(0),
        }, { min: 1 }),
      };

      await provider.addInteraction(
        new Interaction()
          .given('dashboard metrics exist for 24h timeframe')
          .uponReceiving('a request for dashboard metrics with 24h time range')
          .withRequest({
            method: 'GET',
            path: '/api/v1/analytics/dashboard',
            query: { timeRange: '24h' },
            headers: {
              'Content-Type': 'application/json',
              'Authorization': term({
                matcher: 'Bearer .+',
                generate: 'Bearer test-token'
              })
            },
          })
          .willRespondWith({
            status: 200,
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
            body: expectedResponse,
          })
      );

      // Set auth token for test
      require('../../src/services/client').setAuthToken('test-token');
      
      const result = await getDashboardMetrics('24h');
      
      expect(result).toMatchObject({
        activeUsers: expect.any(Number),
        totalSearches: expect.any(Number),
        totalBookings: expect.any(Number),
        conversionRate: expect.any(Number),
        abandonmentRate: expect.any(Number),
        averageSessionDuration: expect.any(Number),
        averageLeadTime: expect.any(Number),
        topDestinations: expect.any(Array),
        topHotels: expect.any(Array),
        funnelStats: expect.any(Array),
      });

      expect(result.topDestinations[0]).toMatchObject({
        destination: expect.any(String),
        count: expect.any(Number),
        percentage: expect.any(Number),
      });
    });

    it('should return dashboard metrics for custom date range', async () => {
      await provider.addInteraction(
        new Interaction()
          .given('dashboard metrics exist for custom date range')
          .uponReceiving('a request for dashboard metrics with custom date range')
          .withRequest({
            method: 'GET',
            path: '/api/v1/analytics/dashboard',
            query: { 
              timeRange: 'custom',
              startDate: '2024-01-01',
              endDate: '2024-01-31'
            },
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer test-token',
            },
          })
          .willRespondWith({
            status: 200,
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
            body: {
              activeUsers: like(35),
              totalSearches: like(2100),
              totalBookings: like(315),
              conversionRate: like(15.0),
              abandonmentRate: like(28.5),
              averageSessionDuration: like(380),
              averageLeadTime: like(14),
              topDestinations: eachLike({
                destination: like('Monterey'),
                count: like(180),
                percentage: like(25.7),
              }),
              topHotels: eachLike({
                hotel: like('Garden Street Inn'),
                searches: like(290),
                bookings: like(42),
                conversionRate: like(14.5),
              }),
              funnelStats: eachLike({
                stage: like('Visitors'),
                count: like(1500),
                percentage: like(100.0),
                dropOffRate: like(0),
              }),
            },
          })
      );

      const result = await getDashboardMetrics('custom', {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      });

      expect(result.activeUsers).toBe(35);
      expect(result.totalSearches).toBe(2100);
    });

    it('should handle 401 unauthorized response', async () => {
      await provider.addInteraction(
        new Interaction()
          .given('user is not authenticated')
          .uponReceiving('a request for dashboard metrics without valid auth')
          .withRequest({
            method: 'GET',
            path: '/api/v1/analytics/dashboard',
            query: { timeRange: '24h' },
            headers: {
              'Content-Type': 'application/json',
            },
          })
          .willRespondWith({
            status: 401,
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
            body: {
              message: like('Unauthorized access'),
              code: like('UNAUTHORIZED'),
            },
          })
      );

      // Clear auth token
      require('../../src/services/client').clearAuthToken();

      await expect(getDashboardMetrics('24h')).rejects.toThrow('HTTP 401');
    });

    it('should handle 500 server error response', async () => {
      await provider.addInteraction(
        new Interaction()
          .given('server is experiencing issues')
          .uponReceiving('a request for dashboard metrics during server error')
          .withRequest({
            method: 'GET',
            path: '/api/v1/analytics/dashboard',
            query: { timeRange: '24h' },
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer test-token',
            },
          })
          .willRespondWith({
            status: 500,
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
            body: {
              message: like('Internal server error'),
              code: like('INTERNAL_ERROR'),
            },
          })
      );

      await expect(getDashboardMetrics('24h')).rejects.toThrow('HTTP 500');
    });
  });

  describe('GET /api/v1/analytics/sessions', () => {
    it('should return paginated sessions', async () => {
      await provider.addInteraction(
        new Interaction()
          .given('sessions exist in the system')
          .uponReceiving('a request for sessions with pagination')
          .withRequest({
            method: 'GET',
            path: '/api/v1/analytics/sessions',
            query: { page: '1', limit: '10' },
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer test-token',
            },
          })
          .willRespondWith({
            status: 200,
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
            body: {
              sessions: eachLike({
                sessionId: like('sess_test_001'),
                userId: like('user_test_001'),
                hotel: like('The Ballard Inn & Restaurant'),
                destination: like('Santa Barbara'),
                status: term({
                  matcher: 'LIVE|DORMANT|CONFIRMED_BOOKING|ABANDONED',
                  generate: 'LIVE'
                }),
                createdAt: iso8601DateTime('2024-01-15T10:30:00Z'),
                updatedAt: iso8601DateTime('2024-01-15T10:45:00Z'),
                checkInDate: like('2024-02-01'),
                checkOutDate: like('2024-02-03'),
                guests: integer(2),
                rooms: integer(1),
                selectedRoomType: like('King Suite'),
                totalPrice: like(450.00),
                currentStage: integer(5),
                completedStages: eachLike('destination', { min: 1 }),
              }, { min: 1 }),
              total: integer(25),
              page: integer(1),
              limit: integer(10),
            },
          })
      );

      const result = await getSessions({ page: 1, limit: 10 });

      expect(result.sessions).toHaveLength(1);
      expect(result.sessions[0]).toMatchObject({
        sessionId: expect.any(String),
        userId: expect.any(String),
        hotel: expect.any(String),
        destination: expect.any(String),
        status: expect.stringMatching(/^(LIVE|DORMANT|CONFIRMED_BOOKING|ABANDONED)$/),
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
        currentStage: expect.any(Number),
        completedStages: expect.any(Array),
      });

      expect(result.total).toBe(25);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('should filter sessions by status', async () => {
      await provider.addInteraction(
        new Interaction()
          .given('live sessions exist in the system')
          .uponReceiving('a request for sessions filtered by LIVE status')
          .withRequest({
            method: 'GET',
            path: '/api/v1/analytics/sessions',
            query: { page: '1', limit: '10', status: 'LIVE' },
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer test-token',
            },
          })
          .willRespondWith({
            status: 200,
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
            body: {
              sessions: eachLike({
                sessionId: like('sess_live_001'),
                userId: like('user_live_001'),
                hotel: like('Test Hotel'),
                destination: like('Test Destination'),
                status: 'LIVE',
                createdAt: iso8601DateTime(),
                updatedAt: iso8601DateTime(),
                currentStage: integer(3),
                completedStages: eachLike('destination'),
              }),
              total: integer(5),
              page: integer(1),
              limit: integer(10),
            },
          })
      );

      const result = await getSessions({ status: 'LIVE' });

      expect(result.sessions.every(s => s.status === 'LIVE')).toBe(true);
      expect(result.total).toBe(5);
    });
  });

  describe('GET /api/v1/analytics/export', () => {
    it('should export metrics in CSV format', async () => {
      await provider.addInteraction(
        new Interaction()
          .given('dashboard metrics exist for export')
          .uponReceiving('a request to export metrics as CSV')
          .withRequest({
            method: 'GET',
            path: '/api/v1/analytics/export',
            query: { format: 'csv', timeRange: '24h' },
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer test-token',
            },
          })
          .willRespondWith({
            status: 200,
            headers: { 
              'Content-Type': 'text/csv',
              'Content-Disposition': 'attachment; filename="metrics-export.csv"'
            },
            body: like('Date,Active Users,Total Searches,Total Bookings\n2024-01-15,42,1567,234'),
          })
      );

      const result = await exportMetrics('csv', '24h');

      expect(typeof result).toBe('string');
      expect(result).toContain('Date,Active Users');
      expect(result).toContain('2024-01-15,42,1567,234');
    });

    it('should export metrics in JSON format', async () => {
      await provider.addInteraction(
        new Interaction()
          .given('dashboard metrics exist for export')
          .uponReceiving('a request to export metrics as JSON')
          .withRequest({
            method: 'GET',
            path: '/api/v1/analytics/export',
            query: { format: 'json', timeRange: '7d' },
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer test-token',
            },
          })
          .willRespondWith({
            status: 200,
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
            body: {
              exportData: {
                timeRange: like('7d'),
                generatedAt: iso8601DateTime(),
                metrics: {
                  activeUsers: like(38),
                  totalSearches: like(2100),
                  totalBookings: like(315),
                  conversionRate: like(15.0),
                },
                sessions: eachLike({
                  sessionId: like('sess_export_001'),
                  status: like('CONFIRMED_BOOKING'),
                  totalPrice: like(275.00),
                }),
              },
              metadata: {
                format: like('json'),
                exportedBy: like('test-user'),
                recordCount: integer(50),
              },
            },
          })
      );

      const result = await exportMetrics('json', '7d');

      expect(result).toMatchObject({
        exportData: {
          timeRange: '7d',
          generatedAt: expect.any(String),
          metrics: {
            activeUsers: expect.any(Number),
            totalSearches: expect.any(Number),
          },
          sessions: expect.any(Array),
        },
        metadata: {
          format: 'json',
          exportedBy: expect.any(String),
          recordCount: expect.any(Number),
        },
      });
    });

    it('should handle invalid export format', async () => {
      await provider.addInteraction(
        new Interaction()
          .given('user requests invalid export format')
          .uponReceiving('a request to export metrics with invalid format')
          .withRequest({
            method: 'GET',
            path: '/api/v1/analytics/export',
            query: { format: 'invalid', timeRange: '24h' },
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer test-token',
            },
          })
          .willRespondWith({
            status: 400,
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
            body: {
              message: like('Invalid export format'),
              code: like('INVALID_FORMAT'),
              supportedFormats: eachLike('csv', { min: 1 }),
            },
          })
      );

      await expect(exportMetrics('invalid' as any, '24h')).rejects.toThrow('HTTP 400');
    });
  });

  describe('Rate Limiting Contract', () => {
    it('should handle rate limit responses', async () => {
      await provider.addInteraction(
        new Interaction()
          .given('rate limit has been exceeded')
          .uponReceiving('a request that exceeds rate limits')
          .withRequest({
            method: 'GET',
            path: '/api/v1/analytics/dashboard',
            query: { timeRange: '24h' },
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer test-token',
            },
          })
          .willRespondWith({
            status: 429,
            headers: { 
              'Content-Type': 'application/json; charset=utf-8',
              'Retry-After': '60',
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': '1642262400'
            },
            body: {
              message: like('Rate limit exceeded'),
              code: like('RATE_LIMITED'),
              retryAfter: integer(60),
            },
          })
      );

      await expect(getDashboardMetrics('24h')).rejects.toThrow('HTTP 429');
    });
  });

  describe('Data Validation Contract', () => {
    it('should enforce required fields in dashboard metrics', async () => {
      await provider.addInteraction(
        new Interaction()
          .given('dashboard metrics with all required fields exist')
          .uponReceiving('a request for complete dashboard metrics')
          .withRequest({
            method: 'GET',
            path: '/api/v1/analytics/dashboard',
            query: { timeRange: '24h' },
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer test-token',
            },
          })
          .willRespondWith({
            status: 200,
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
            body: {
              activeUsers: integer(42), // Must be integer
              totalSearches: integer(1567), // Must be integer  
              totalBookings: integer(234), // Must be integer
              conversionRate: like(14.9), // Can be float
              abandonmentRate: like(31.2), // Can be float
              averageSessionDuration: integer(342), // Must be integer (seconds)
              averageLeadTime: integer(12), // Must be integer (days)
              topDestinations: eachLike({
                destination: like('Santa Barbara'), // Must be string
                count: integer(145), // Must be integer
                percentage: like(23.4), // Can be float
              }, { min: 1 }),
              topHotels: eachLike({
                hotel: like('The Ballard Inn'), // Must be string
                searches: integer(234), // Must be integer
                bookings: integer(34), // Must be integer  
                conversionRate: like(14.5), // Can be float
              }, { min: 1 }),
              funnelStats: eachLike({
                stage: like('Visitors'), // Must be string
                count: integer(1000), // Must be integer
                percentage: like(100.0), // Can be float
                dropOffRate: like(0), // Can be float
              }, { min: 1 }),
            },
          })
      );

      const result = await getDashboardMetrics('24h');

      // Validate data types
      expect(Number.isInteger(result.activeUsers)).toBe(true);
      expect(Number.isInteger(result.totalSearches)).toBe(true);
      expect(Number.isInteger(result.totalBookings)).toBe(true);
      expect(Number.isInteger(result.averageSessionDuration)).toBe(true);
      expect(Number.isInteger(result.averageLeadTime)).toBe(true);

      // Validate array structures
      expect(Array.isArray(result.topDestinations)).toBe(true);
      expect(Array.isArray(result.topHotels)).toBe(true);
      expect(Array.isArray(result.funnelStats)).toBe(true);

      // Validate nested object structures
      result.topDestinations.forEach(dest => {
        expect(typeof dest.destination).toBe('string');
        expect(Number.isInteger(dest.count)).toBe(true);
        expect(typeof dest.percentage).toBe('number');
      });

      result.funnelStats.forEach(stage => {
        expect(typeof stage.stage).toBe('string');
        expect(Number.isInteger(stage.count)).toBe(true);
        expect(typeof stage.percentage).toBe('number');
        expect(typeof stage.dropOffRate).toBe('number');
      });
    });

    it('should validate session status enum values', async () => {
      await provider.addInteraction(
        new Interaction()
          .given('sessions with valid status values exist')
          .uponReceiving('a request for sessions with status validation')
          .withRequest({
            method: 'GET',
            path: '/api/v1/analytics/sessions',
            query: { page: '1', limit: '5' },
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer test-token',
            },
          })
          .willRespondWith({
            status: 200,
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
            body: {
              sessions: [
                {
                  sessionId: like('sess_001'),
                  userId: like('user_001'),
                  hotel: like('Hotel A'),
                  destination: like('Destination A'),
                  status: 'LIVE', // Exact value
                  createdAt: iso8601DateTime(),
                  updatedAt: iso8601DateTime(),
                  currentStage: integer(1),
                  completedStages: eachLike('destination'),
                },
                {
                  sessionId: like('sess_002'),
                  userId: like('user_002'),
                  hotel: like('Hotel B'),
                  destination: like('Destination B'),
                  status: 'ABANDONED', // Exact value
                  createdAt: iso8601DateTime(),
                  updatedAt: iso8601DateTime(),
                  currentStage: integer(2),
                  completedStages: eachLike('destination'),
                },
                {
                  sessionId: like('sess_003'),
                  userId: like('user_003'),
                  hotel: like('Hotel C'),
                  destination: like('Destination C'),
                  status: 'CONFIRMED_BOOKING', // Exact value
                  createdAt: iso8601DateTime(),
                  updatedAt: iso8601DateTime(),
                  currentStage: integer(10),
                  completedStages: eachLike('destination'),
                },
              ],
              total: integer(3),
              page: integer(1),
              limit: integer(5),
            },
          })
      );

      const result = await getSessions({ page: 1, limit: 5 });

      const validStatuses = ['LIVE', 'DORMANT', 'CONFIRMED_BOOKING', 'ABANDONED'];
      result.sessions.forEach(session => {
        expect(validStatuses).toContain(session.status);
      });
    });
  });
});