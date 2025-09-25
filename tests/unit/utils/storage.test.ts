import { storage } from '../../../src/utils/storage';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] || null,
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('storage utilities', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('basic operations', () => {
    it('stores and retrieves strings', () => {
      storage.setItem('test-key', 'test-value');
      expect(storage.getItem('test-key', null)).toBe('test-value');
    });

    it('stores and retrieves objects', () => {
      const testObj = { name: 'John', age: 30 };
      storage.setItem('test-obj', testObj);
      expect(storage.getItem('test-obj', null)).toEqual(testObj);
    });

    it('stores and retrieves arrays', () => {
      const testArray = [1, 2, 3, 'test'];
      storage.setItem('test-array', testArray);
      expect(storage.getItem('test-array', null)).toEqual(testArray);
    });

    it('stores and retrieves numbers', () => {
      storage.setItem('test-number', 42);
      expect(storage.getItem('test-number', null)).toBe(42);
    });

    it('stores and retrieves booleans', () => {
      storage.setItem('test-bool-true', true);
      storage.setItem('test-bool-false', false);
      expect(storage.getItem('test-bool-true', null)).toBe(true);
      expect(storage.getItem('test-bool-false', null)).toBe(false);
    });

    it('returns null for non-existent keys', () => {
      expect(storage.getItem('non-existent', null)).toBeNull();
    });

    it('removes items correctly', () => {
      storage.setItem('to-remove', 'value');
      expect(storage.getItem('to-remove', null)).toBe('value');

      storage.removeItem('to-remove');
      expect(storage.getItem('to-remove', null)).toBeNull();
    });

    it('clears all items', () => {
      storage.setItem('key1', 'value1');
      storage.setItem('key2', 'value2');

      expect(storage.getItem('key1', null)).toBe('value1');
      expect(storage.getItem('key2', null)).toBe('value2');

      storage.clear();

      expect(storage.getItem('key1', null)).toBeNull();
      expect(storage.getItem('key2', null)).toBeNull();
    });
  });

  describe('advanced operations', () => {
    it('gets storage info', () => {
      storage.setItem('key1', 'value1');
      storage.setItem('key2', 'value2');
      storage.setItem('key3', 'value3');

      const info = storage.getStorageInfo();
      expect(info.available).toBe(5 * 1024 * 1024); // 5MB
      expect(typeof info.percentage).toBe('number');
      expect(typeof info.used).toBe('number');
    });

    it('calculates storage size', () => {
      localStorage.clear();
      const info1 = storage.getStorageInfo();

      storage.setItem('test-size', 'hello world');

      const info2 = storage.getStorageInfo();
      expect(typeof info2.used).toBe('number');
      expect(typeof info1.used).toBe('number');
    });

    it('checks storage availability', () => {
      expect(storage.isAvailable()).toBe(true);
    });

    it('handles user preferences', () => {
      storage.setUserPreference('theme', 'dark');
      storage.setUserPreference('language', 'en');

      expect(storage.getUserPreference('theme', 'light')).toBe('dark');
      expect(storage.getUserPreference('language', 'es')).toBe('en');
      expect(storage.getUserPreference('missing', 'default')).toBe('default');
    });

    it('provides default values', () => {
      const defaultValue = { default: true };
      const result = storage.getItem('non-existent', defaultValue);
      expect(result).toEqual(defaultValue);
    });
  });

  describe('error handling', () => {
    it('handles localStorage unavailability', () => {
      // Mock localStorage to throw errors
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = jest.fn(() => {
        throw new Error('localStorage unavailable');
      });

      expect(() => storage.setItem('test', 'value')).not.toThrow();
      expect(storage.setItem('test', 'value')).toBe(false);

      // Restore original method
      localStorage.setItem = originalSetItem;
    });

    it('handles JSON parsing errors gracefully', () => {
      // Manually set invalid JSON in localStorage
      localStorage.setItem('invalid-json', '{invalid json}');

      expect(storage.getItem('invalid-json', null)).toBeNull();
    });

    it('handles quota exceeded errors', () => {
      // Mock quota exceeded error
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = jest.fn(() => {
        const error = new Error('QuotaExceededError');
        error.name = 'QuotaExceededError';
        throw error;
      });

      expect(() => storage.setItem('test', 'value')).not.toThrow();
      expect(storage.setItem('test', 'value')).toBe(false);

      localStorage.setItem = originalSetItem;
    });

    it('handles circular references in objects', () => {
      const circularObj: any = { name: 'test' };
      circularObj.self = circularObj;

      expect(() => storage.setItem('circular', circularObj)).not.toThrow();
      expect(storage.setItem('circular', circularObj)).toBe(false);
    });
  });

  describe('expiration functionality', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('stores cached data with expiration', () => {
      const testData = { message: 'test' };
      storage.setCachedData('expiring-key', testData, 60000); // 1 minute

      expect(storage.getCachedData('expiring-key')).toEqual(testData);
    });

    it('returns null for expired cached data', () => {
      const testData = { message: 'test' };
      storage.setCachedData('expiring-key', testData, 1000); // 1 second

      // Fast-forward past expiration
      jest.advanceTimersByTime(2000);

      expect(storage.getCachedData('expiring-key')).toBeNull();
    });

    it('clears expired cache items automatically', () => {
      const testData = { message: 'test' };
      storage.setCachedData('expiring-key', testData, 1000);

      // Verify it exists
      expect(storage.getCachedData('expiring-key')).toEqual(testData);

      // Fast-forward past expiration
      jest.advanceTimersByTime(2000);

      // Accessing expired item should clean it up
      expect(storage.getCachedData('expiring-key')).toBeNull();

      // Should be removed from localStorage
      expect(storage.getItem('cache_expiring-key', null)).toBeNull();
    });
  });

  describe('dashboard settings', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('stores and retrieves dashboard settings', () => {
      storage.setDashboardSetting('layout', 'grid');
      storage.setDashboardSetting('theme', 'dark');

      expect(storage.getDashboardSetting('layout', 'list')).toBe('grid');
      expect(storage.getDashboardSetting('theme', 'light')).toBe('dark');
      expect(storage.getDashboardSetting('missing', 'default')).toBe('default');
    });

    it('handles cache expiration cleanup', () => {
      // Set some cached data with different expiration times
      storage.setCachedData('short-cache', 'data1', 1000);
      storage.setCachedData('long-cache', 'data2', 60000);

      // Fast-forward past short expiration
      jest.advanceTimersByTime(2000);

      // Clear expired cache
      storage.clearExpiredCache();

      // Short cache should be gone, long cache should remain
      expect(storage.getCachedData('short-cache')).toBeNull();
      expect(storage.getCachedData('long-cache')).toEqual('data2');
    });
  });

  describe('performance and memory', () => {
    it('handles large data efficiently', () => {
      const largeArray = new Array(1000).fill('test-data'); // Reduced size for test performance

      const startTime = Date.now();
      storage.setItem('large-data', largeArray);
      const retrieved = storage.getItem('large-data', null);
      const endTime = Date.now();

      expect(retrieved).toEqual(largeArray);
      expect(endTime - startTime).toBeLessThan(500); // Should be reasonably fast
    });

    it('handles many small items', () => {
      const startTime = Date.now();

      for (let i = 0; i < 100; i++) { // Reduced count for test performance
        storage.setItem(`item-${i}`, `value-${i}`);
      }

      for (let i = 0; i < 100; i++) {
        expect(storage.getItem(`item-${i}`, null)).toBe(`value-${i}`);
      }

      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });

  describe('data integrity', () => {
    it('maintains data type consistency', () => {
      const testData = {
        string: 'hello',
        number: 42,
        boolean: true,
        array: [1, 2, 3],
        object: { nested: 'value' },
        null: null,
      };

      Object.entries(testData).forEach(([key, value]) => {
        storage.setItem(key, value);
        expect(storage.getItem(key, 'default')).toEqual(value);
      });
    });

    it('handles special characters in keys', () => {
      const specialKeys = [
        'key with spaces',
        'key:with:colons',
        'key/with/slashes',
        'key@with@symbols',
        '中文键名',
      ];

      specialKeys.forEach(key => {
        storage.setItem(key, 'value');
        expect(storage.getItem(key, null)).toBe('value');
      });
    });

    it('preserves data across operations', () => {
      storage.setItem('persistent', 'initial-value');

      // Perform other operations
      storage.setItem('temp1', 'temp');
      storage.setItem('temp2', 'temp');
      storage.removeItem('temp1');

      // Original data should remain intact
      expect(storage.getItem('persistent', null)).toBe('initial-value');
    });
  });
});