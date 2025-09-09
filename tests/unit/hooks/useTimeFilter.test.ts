import { renderHook, act } from '../../setup/testUtils';
import { useTimeFilter } from '../../../src/hooks/useTimeFilter';
import { TimeFilterProvider } from '../../../src/contexts/TimeFilterContext';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <TimeFilterProvider>
    {children}
  </TimeFilterProvider>
);

describe('useTimeFilter', () => {
  it('returns default time filter', () => {
    const { result } = renderHook(() => useTimeFilter(), { wrapper });

    expect(result.current.timeRange).toBe('24h');
    expect(result.current.customRange).toBeNull();
    expect(result.current.isCustomRange).toBe(false);
  });

  it('updates time range', () => {
    const { result } = renderHook(() => useTimeFilter(), { wrapper });

    act(() => {
      result.current.setTimeRange('7d');
    });

    expect(result.current.timeRange).toBe('7d');
    expect(result.current.isCustomRange).toBe(false);
  });

  it('handles custom time range', () => {
    const { result } = renderHook(() => useTimeFilter(), { wrapper });

    const customRange = {
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-07'),
    };

    act(() => {
      result.current.setCustomRange(customRange);
    });

    expect(result.current.customRange).toEqual(customRange);
    expect(result.current.isCustomRange).toBe(true);
    expect(result.current.timeRange).toBe('custom');
  });

  it('clears custom range when setting preset range', () => {
    const { result } = renderHook(() => useTimeFilter(), { wrapper });

    const customRange = {
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-07'),
    };

    act(() => {
      result.current.setCustomRange(customRange);
    });

    expect(result.current.isCustomRange).toBe(true);

    act(() => {
      result.current.setTimeRange('30d');
    });

    expect(result.current.timeRange).toBe('30d');
    expect(result.current.customRange).toBeNull();
    expect(result.current.isCustomRange).toBe(false);
  });

  it('provides date range calculation for preset ranges', () => {
    const { result } = renderHook(() => useTimeFilter(), { wrapper });

    act(() => {
      result.current.setTimeRange('24h');
    });

    const dateRange = result.current.getDateRange();
    expect(dateRange.startDate).toBeInstanceOf(Date);
    expect(dateRange.endDate).toBeInstanceOf(Date);
    
    const hoursDiff = (dateRange.endDate.getTime() - dateRange.startDate.getTime()) / (1000 * 60 * 60);
    expect(Math.abs(hoursDiff - 24)).toBeLessThan(1);
  });

  it('calculates correct date range for 7 days', () => {
    const { result } = renderHook(() => useTimeFilter(), { wrapper });

    act(() => {
      result.current.setTimeRange('7d');
    });

    const dateRange = result.current.getDateRange();
    const daysDiff = (dateRange.endDate.getTime() - dateRange.startDate.getTime()) / (1000 * 60 * 60 * 24);
    expect(Math.abs(daysDiff - 7)).toBeLessThan(1);
  });

  it('calculates correct date range for 30 days', () => {
    const { result } = renderHook(() => useTimeFilter(), { wrapper });

    act(() => {
      result.current.setTimeRange('30d');
    });

    const dateRange = result.current.getDateRange();
    const daysDiff = (dateRange.endDate.getTime() - dateRange.startDate.getTime()) / (1000 * 60 * 60 * 24);
    expect(Math.abs(daysDiff - 30)).toBeLessThan(1);
  });

  it('returns custom range when set', () => {
    const { result } = renderHook(() => useTimeFilter(), { wrapper });

    const customRange = {
      startDate: new Date('2024-01-01T00:00:00Z'),
      endDate: new Date('2024-01-07T23:59:59Z'),
    };

    act(() => {
      result.current.setCustomRange(customRange);
    });

    const dateRange = result.current.getDateRange();
    expect(dateRange.startDate).toEqual(customRange.startDate);
    expect(dateRange.endDate).toEqual(customRange.endDate);
  });

  it('formats time range labels correctly', () => {
    const { result } = renderHook(() => useTimeFilter(), { wrapper });

    const testCases = [
      { range: '1h', expected: 'Last Hour' },
      { range: '24h', expected: 'Last 24 Hours' },
      { range: '7d', expected: 'Last 7 Days' },
      { range: '30d', expected: 'Last 30 Days' },
      { range: '90d', expected: 'Last 90 Days' },
    ];

    testCases.forEach(({ range, expected }) => {
      const label = result.current.getTimeRangeLabel(range);
      expect(label).toBe(expected);
    });
  });

  it('handles custom range label', () => {
    const { result } = renderHook(() => useTimeFilter(), { wrapper });

    const customRange = {
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-07'),
    };

    act(() => {
      result.current.setCustomRange(customRange);
    });

    const label = result.current.getTimeRangeLabel('custom');
    expect(label).toContain('Jan 1');
    expect(label).toContain('Jan 7');
  });

  it('validates date ranges', () => {
    const { result } = renderHook(() => useTimeFilter(), { wrapper });

    const invalidRange = {
      startDate: new Date('2024-01-07'),
      endDate: new Date('2024-01-01'), // End before start
    };

    act(() => {
      result.current.setCustomRange(invalidRange);
    });

    // Should not set invalid range
    expect(result.current.customRange).toBeNull();
    expect(result.current.isCustomRange).toBe(false);
  });

  it('provides available time range options', () => {
    const { result } = renderHook(() => useTimeFilter(), { wrapper });

    const options = result.current.getAvailableRanges();
    
    expect(options).toEqual([
      { value: '1h', label: 'Last Hour' },
      { value: '24h', label: 'Last 24 Hours' },
      { value: '7d', label: 'Last 7 Days' },
      { value: '30d', label: 'Last 30 Days' },
      { value: '90d', label: 'Last 90 Days' },
    ]);
  });

  it('persists time range selection', () => {
    const { result: result1 } = renderHook(() => useTimeFilter(), { wrapper });

    act(() => {
      result1.current.setTimeRange('7d');
    });

    // Create a new hook instance (simulating component remount)
    const { result: result2 } = renderHook(() => useTimeFilter(), { wrapper });

    expect(result2.current.timeRange).toBe('7d');
  });

  it('handles timezone considerations', () => {
    const { result } = renderHook(() => useTimeFilter(), { wrapper });

    act(() => {
      result.current.setTimeRange('24h');
    });

    const dateRange = result.current.getDateRange();
    
    // Should use local timezone for calculations
    expect(dateRange.startDate.getTimezoneOffset()).toBe(dateRange.endDate.getTimezoneOffset());
  });

  it('provides refresh functionality', () => {
    const { result } = renderHook(() => useTimeFilter(), { wrapper });

    const initialDateRange = result.current.getDateRange();

    // Wait a small amount to ensure time difference
    setTimeout(() => {
      act(() => {
        result.current.refresh();
      });

      const refreshedDateRange = result.current.getDateRange();
      expect(refreshedDateRange.endDate.getTime()).toBeGreaterThan(initialDateRange.endDate.getTime());
    }, 10);
  });

  it('handles edge case: hour range at midnight', () => {
    const { result } = renderHook(() => useTimeFilter(), { wrapper });

    // Mock current time to be just after midnight
    const mockDate = new Date('2024-01-15T00:30:00Z');
    jest.spyOn(Date, 'now').mockReturnValue(mockDate.getTime());

    act(() => {
      result.current.setTimeRange('1h');
    });

    const dateRange = result.current.getDateRange();
    const hoursDiff = (dateRange.endDate.getTime() - dateRange.startDate.getTime()) / (1000 * 60 * 60);
    expect(Math.abs(hoursDiff - 1)).toBeLessThan(0.1);

    jest.restoreAllMocks();
  });
});