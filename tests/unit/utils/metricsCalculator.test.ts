import {
  calculateConversionRate,
  calculateDropOffRate,
  formatDuration,
  formatNumber,
  calculatePercentageChange,
  aggregateMetrics,
  validateMetricsData,
} from '../../../src/utils/metricsCalculator';
import { mockDashboardMetrics, mockSessions } from '../../fixtures/mockData';

describe('metricsCalculator', () => {
  describe('calculateConversionRate', () => {
    it('calculates conversion rate correctly', () => {
      const rate = calculateConversionRate(200, 1000);
      expect(rate).toBe(20);
    });

    it('handles zero total conversions', () => {
      const rate = calculateConversionRate(0, 1000);
      expect(rate).toBe(0);
    });

    it('handles zero total visitors', () => {
      const rate = calculateConversionRate(200, 0);
      expect(rate).toBe(0);
    });

    it('rounds to specified decimal places', () => {
      const rate = calculateConversionRate(1, 3, 2);
      expect(rate).toBe(33.33);
    });

    it('defaults to 1 decimal place', () => {
      const rate = calculateConversionRate(1, 3);
      expect(rate).toBe(33.3);
    });
  });

  describe('calculateDropOffRate', () => {
    it('calculates drop-off rate correctly', () => {
      const rate = calculateDropOffRate(800, 1000);
      expect(rate).toBe(20);
    });

    it('handles zero remaining users', () => {
      const rate = calculateDropOffRate(0, 1000);
      expect(rate).toBe(100);
    });

    it('handles zero initial users', () => {
      const rate = calculateDropOffRate(800, 0);
      expect(rate).toBe(0);
    });

    it('handles equal initial and remaining users', () => {
      const rate = calculateDropOffRate(1000, 1000);
      expect(rate).toBe(0);
    });
  });

  describe('formatDuration', () => {
    it('formats seconds only', () => {
      expect(formatDuration(45)).toBe('45s');
    });

    it('formats minutes and seconds', () => {
      expect(formatDuration(125)).toBe('2m 5s');
    });

    it('formats hours, minutes, and seconds', () => {
      expect(formatDuration(3665)).toBe('1h 1m 5s');
    });

    it('formats hours and minutes only', () => {
      expect(formatDuration(3600)).toBe('1h 0m 0s');
    });

    it('handles zero seconds', () => {
      expect(formatDuration(0)).toBe('0s');
    });

    it('handles large durations', () => {
      expect(formatDuration(90061)).toBe('25h 1m 1s');
    });
  });

  describe('formatNumber', () => {
    it('formats small numbers as-is', () => {
      expect(formatNumber(123)).toBe('123');
    });

    it('formats thousands with K', () => {
      expect(formatNumber(1234)).toBe('1.2K');
      expect(formatNumber(1567)).toBe('1.6K');
    });

    it('formats millions with M', () => {
      expect(formatNumber(1234567)).toBe('1.2M');
      expect(formatNumber(1567890)).toBe('1.6M');
    });

    it('formats billions with B', () => {
      expect(formatNumber(1234567890)).toBe('1.2B');
    });

    it('handles zero', () => {
      expect(formatNumber(0)).toBe('0');
    });

    it('handles negative numbers', () => {
      expect(formatNumber(-1234)).toBe('-1.2K');
    });

    it('handles decimal inputs', () => {
      expect(formatNumber(1234.56)).toBe('1.2K');
    });
  });

  describe('calculatePercentageChange', () => {
    it('calculates positive percentage change', () => {
      const change = calculatePercentageChange(100, 120);
      expect(change).toBe(20);
    });

    it('calculates negative percentage change', () => {
      const change = calculatePercentageChange(120, 100);
      expect(change).toBe(-16.7);
    });

    it('handles zero old value', () => {
      const change = calculatePercentageChange(0, 100);
      expect(change).toBe(100);
    });

    it('handles zero new value', () => {
      const change = calculatePercentageChange(100, 0);
      expect(change).toBe(-100);
    });

    it('handles both values zero', () => {
      const change = calculatePercentageChange(0, 0);
      expect(change).toBe(0);
    });

    it('rounds to specified decimal places', () => {
      const change = calculatePercentageChange(3, 7, 2);
      expect(change).toBe(133.33);
    });
  });

  describe('aggregateMetrics', () => {
    it('aggregates session metrics correctly', () => {
      const aggregated = aggregateMetrics(mockSessions);
      
      expect(aggregated.totalSessions).toBe(3);
      expect(aggregated.liveSessions).toBe(1);
      expect(aggregated.abandondedSessions).toBe(1);
      expect(aggregated.confirmedBookings).toBe(1);
    });

    it('calculates average session duration', () => {
      const aggregated = aggregateMetrics(mockSessions);
      
      expect(aggregated.averageSessionDuration).toBeGreaterThan(0);
      expect(typeof aggregated.averageSessionDuration).toBe('number');
    });

    it('handles empty sessions array', () => {
      const aggregated = aggregateMetrics([]);
      
      expect(aggregated.totalSessions).toBe(0);
      expect(aggregated.liveSessions).toBe(0);
      expect(aggregated.abandondedSessions).toBe(0);
      expect(aggregated.confirmedBookings).toBe(0);
      expect(aggregated.averageSessionDuration).toBe(0);
    });

    it('calculates total revenue correctly', () => {
      const aggregated = aggregateMetrics(mockSessions);
      
      const expectedRevenue = mockSessions
        .filter(s => s.status === 'CONFIRMED_BOOKING' && s.totalPrice)
        .reduce((sum, s) => sum + (s.totalPrice || 0), 0);
      
      expect(aggregated.totalRevenue).toBe(expectedRevenue);
    });

    it('handles sessions without prices', () => {
      const sessionsWithoutPrices = mockSessions.map(s => {
        const { totalPrice, ...sessionWithoutPrice } = s;
        return sessionWithoutPrice;
      });
      
      const aggregated = aggregateMetrics(sessionsWithoutPrices as any);
      expect(aggregated.totalRevenue).toBe(0);
    });
  });

  describe('validateMetricsData', () => {
    it('validates correct metrics data', () => {
      const isValid = validateMetricsData(mockDashboardMetrics);
      expect(isValid).toBe(true);
    });

    it('rejects metrics with negative values', () => {
      const invalidMetrics = {
        ...mockDashboardMetrics,
        activeUsers: -5,
      };
      
      const isValid = validateMetricsData(invalidMetrics);
      expect(isValid).toBe(false);
    });

    it('rejects metrics with invalid conversion rate', () => {
      const invalidMetrics = {
        ...mockDashboardMetrics,
        conversionRate: 150, // > 100%
      };
      
      const isValid = validateMetricsData(invalidMetrics);
      expect(isValid).toBe(false);
    });

    it('rejects metrics with missing required fields', () => {
      const incompleteMetrics = {
        activeUsers: 50,
        totalSearches: 1000,
        // missing other required fields
      };
      
      const isValid = validateMetricsData(incompleteMetrics as any);
      expect(isValid).toBe(false);
    });

    it('rejects metrics with invalid funnel stats', () => {
      const invalidMetrics = {
        ...mockDashboardMetrics,
        funnelStats: [
          { stage: 'Visitors', count: 1000, percentage: 100.0, dropOffRate: 0 },
          { stage: 'Bookings', count: 1500, percentage: 150.0, dropOffRate: -50 }, // Invalid
        ],
      };
      
      const isValid = validateMetricsData(invalidMetrics);
      expect(isValid).toBe(false);
    });

    it('handles null or undefined input', () => {
      expect(validateMetricsData(null as any)).toBe(false);
      expect(validateMetricsData(undefined as any)).toBe(false);
    });

    it('validates array fields correctly', () => {
      const validMetrics = {
        ...mockDashboardMetrics,
        topDestinations: [],
        topHotels: [],
      };
      
      const isValid = validateMetricsData(validMetrics);
      expect(isValid).toBe(true);
    });

    it('rejects non-array fields that should be arrays', () => {
      const invalidMetrics = {
        ...mockDashboardMetrics,
        topDestinations: 'not an array',
      };
      
      const isValid = validateMetricsData(invalidMetrics as any);
      expect(isValid).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('handles extremely large numbers', () => {
      const largeNumber = 9999999999999;
      const formatted = formatNumber(largeNumber);
      expect(formatted).toContain('T');
    });

    it('handles very small positive numbers', () => {
      const rate = calculateConversionRate(1, 1000000);
      expect(rate).toBe(0);
    });

    it('handles floating point precision issues', () => {
      const rate = calculateConversionRate(1, 3, 10);
      expect(typeof rate).toBe('number');
      expect(rate).toBeCloseTo(33.3333333333, 10);
    });

    it('validates metrics with boundary values', () => {
      const boundaryMetrics = {
        ...mockDashboardMetrics,
        conversionRate: 100, // Exactly 100%
        abandonmentRate: 0, // Exactly 0%
      };
      
      const isValid = validateMetricsData(boundaryMetrics);
      expect(isValid).toBe(true);
    });
  });
});