import {
  setItem,
  getItem,
  removeItem,
  clear,
  getAllKeys,
  getStorageSize,
  isStorageAvailable,
  createStorageManager,
} from '../../../src/utils/storage';

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
      setItem('test-key', 'test-value');
      expect(getItem('test-key')).toBe('test-value');
    });

    it('stores and retrieves objects', () => {
      const testObj = { name: 'John', age: 30 };
      setItem('test-obj', testObj);
      expect(getItem('test-obj')).toEqual(testObj);
    });

    it('stores and retrieves arrays', () => {
      const testArray = [1, 2, 3, 'test'];
      setItem('test-array', testArray);
      expect(getItem('test-array')).toEqual(testArray);
    });

    it('stores and retrieves numbers', () => {
      setItem('test-number', 42);
      expect(getItem('test-number')).toBe(42);
    });

    it('stores and retrieves booleans', () => {
      setItem('test-bool-true', true);
      setItem('test-bool-false', false);
      expect(getItem('test-bool-true')).toBe(true);
      expect(getItem('test-bool-false')).toBe(false);
    });

    it('returns null for non-existent keys', () => {
      expect(getItem('non-existent')).toBeNull();
    });

    it('removes items correctly', () => {
      setItem('to-remove', 'value');
      expect(getItem('to-remove')).toBe('value');
      
      removeItem('to-remove');
      expect(getItem('to-remove')).toBeNull();
    });

    it('clears all items', () => {
      setItem('key1', 'value1');
      setItem('key2', 'value2');
      
      expect(getItem('key1')).toBe('value1');
      expect(getItem('key2')).toBe('value2');
      
      clear();
      
      expect(getItem('key1')).toBeNull();
      expect(getItem('key2')).toBeNull();
    });
  });

  describe('advanced operations', () => {
    it('gets all keys', () => {
      setItem('key1', 'value1');
      setItem('key2', 'value2');
      setItem('key3', 'value3');
      
      const keys = getAllKeys();
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys).toContain('key3');
      expect(keys.length).toBe(3);
    });

    it('calculates storage size', () => {
      const size1 = getStorageSize();
      
      setItem('test-size', 'hello world');
      
      const size2 = getStorageSize();
      expect(size2).toBeGreaterThan(size1);
    });

    it('checks storage availability', () => {
      expect(isStorageAvailable()).toBe(true);
    });

    it('filters keys by prefix', () => {
      setItem('app:setting1', 'value1');
      setItem('app:setting2', 'value2');
      setItem('other:setting', 'value3');
      
      const appKeys = getAllKeys('app:');
      expect(appKeys).toContain('app:setting1');
      expect(appKeys).toContain('app:setting2');
      expect(appKeys).not.toContain('other:setting');
    });

    it('provides default values', () => {
      const defaultValue = { default: true };
      const result = getItem('non-existent', defaultValue);
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

      expect(() => setItem('test', 'value')).not.toThrow();
      
      // Restore original method
      localStorage.setItem = originalSetItem;
    });

    it('handles JSON parsing errors gracefully', () => {
      // Manually set invalid JSON in localStorage
      localStorage.setItem('invalid-json', '{invalid json}');
      
      expect(getItem('invalid-json')).toBeNull();
    });

    it('handles quota exceeded errors', () => {
      // Mock quota exceeded error
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = jest.fn(() => {
        const error = new Error('QuotaExceededError');
        error.name = 'QuotaExceededError';
        throw error;
      });

      expect(() => setItem('test', 'value')).not.toThrow();
      
      localStorage.setItem = originalSetItem;
    });

    it('handles circular references in objects', () => {
      const circularObj: any = { name: 'test' };
      circularObj.self = circularObj;
      
      expect(() => setItem('circular', circularObj)).not.toThrow();
      expect(getItem('circular')).toBeNull();
    });
  });

  describe('expiration functionality', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('stores items with expiration', () => {
      const expirationTime = Date.now() + 60000; // 1 minute
      setItem('expiring-key', 'value', { expires: expirationTime });
      
      expect(getItem('expiring-key')).toBe('value');
    });

    it('returns null for expired items', () => {
      const expirationTime = Date.now() + 1000; // 1 second
      setItem('expiring-key', 'value', { expires: expirationTime });
      
      // Fast-forward past expiration
      jest.advanceTimersByTime(2000);
      
      expect(getItem('expiring-key')).toBeNull();
    });

    it('cleans up expired items automatically', () => {
      const expirationTime = Date.now() + 1000;
      setItem('expiring-key', 'value', { expires: expirationTime });
      
      expect(getAllKeys()).toContain('expiring-key');
      
      // Fast-forward past expiration
      jest.advanceTimersByTime(2000);
      
      // Accessing expired item should clean it up
      getItem('expiring-key');
      
      expect(getAllKeys()).not.toContain('expiring-key');
    });
  });

  describe('encryption functionality', () => {
    it('stores and retrieves encrypted data', () => {
      const sensitiveData = { password: 'secret123' };
      setItem('sensitive', sensitiveData, { encrypt: true });
      
      // Raw stored value should be encrypted (not readable)
      const rawValue = localStorage.getItem('sensitive');
      expect(rawValue).not.toContain('secret123');
      
      // But getItem should decrypt it properly
      expect(getItem('sensitive')).toEqual(sensitiveData);
    });

    it('handles encryption errors gracefully', () => {
      // This would depend on your encryption implementation
      expect(() => setItem('test', 'value', { encrypt: true })).not.toThrow();
    });
  });

  describe('storage manager', () => {
    it('creates namespaced storage manager', () => {
      const userStorage = createStorageManager('user');
      
      userStorage.set('name', 'John');
      userStorage.set('age', 30);
      
      expect(userStorage.get('name')).toBe('John');
      expect(userStorage.get('age')).toBe(30);
      
      // Should be stored with namespace prefix
      expect(getItem('user:name')).toBe('John');
    });

    it('provides isolated namespaces', () => {
      const userStorage = createStorageManager('user');
      const appStorage = createStorageManager('app');
      
      userStorage.set('setting', 'user-value');
      appStorage.set('setting', 'app-value');
      
      expect(userStorage.get('setting')).toBe('user-value');
      expect(appStorage.get('setting')).toBe('app-value');
    });

    it('lists keys within namespace', () => {
      const userStorage = createStorageManager('user');
      
      userStorage.set('name', 'John');
      userStorage.set('email', 'john@example.com');
      setItem('other:key', 'value'); // Outside namespace
      
      const keys = userStorage.keys();
      expect(keys).toContain('name');
      expect(keys).toContain('email');
      expect(keys).not.toContain('other:key');
    });

    it('clears only namespace items', () => {
      const userStorage = createStorageManager('user');
      
      userStorage.set('name', 'John');
      setItem('global:setting', 'value');
      
      userStorage.clear();
      
      expect(userStorage.get('name')).toBeNull();
      expect(getItem('global:setting')).toBe('value');
    });

    it('calculates namespace storage size', () => {
      const userStorage = createStorageManager('user');
      
      const initialSize = userStorage.size();
      userStorage.set('data', 'some data');
      const newSize = userStorage.size();
      
      expect(newSize).toBeGreaterThan(initialSize);
    });
  });

  describe('performance and memory', () => {
    it('handles large data efficiently', () => {
      const largeArray = new Array(10000).fill('test-data');
      
      const startTime = Date.now();
      setItem('large-data', largeArray);
      const retrieved = getItem('large-data');
      const endTime = Date.now();
      
      expect(retrieved).toEqual(largeArray);
      expect(endTime - startTime).toBeLessThan(100); // Should be reasonably fast
    });

    it('handles many small items', () => {
      const startTime = Date.now();
      
      for (let i = 0; i < 1000; i++) {
        setItem(`item-${i}`, `value-${i}`);
      }
      
      for (let i = 0; i < 1000; i++) {
        expect(getItem(`item-${i}`)).toBe(`value-${i}`);
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
        undefined: undefined,
      };
      
      Object.entries(testData).forEach(([key, value]) => {
        setItem(key, value);
        expect(getItem(key)).toEqual(value);
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
        setItem(key, 'value');
        expect(getItem(key)).toBe('value');
      });
    });

    it('preserves data across operations', () => {
      setItem('persistent', 'initial-value');
      
      // Perform other operations
      setItem('temp1', 'temp');
      setItem('temp2', 'temp');
      removeItem('temp1');
      
      // Original data should remain intact
      expect(getItem('persistent')).toBe('initial-value');
    });
  });
});