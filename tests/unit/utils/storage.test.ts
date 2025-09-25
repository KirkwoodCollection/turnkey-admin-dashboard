import { storage } from '../../../src/utils/storage';

describe('storage utilities', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('localStorage operations', () => {
    it('stores and retrieves string values', () => {
      storage.setItem('testKey', 'testValue');
      expect(storage.getItem('testKey', null)).toBe('testValue');
    });

    it('stores and retrieves object values', () => {
      const testObj = { key: 'value', number: 42 };
      storage.setItem('testObj', testObj);
      expect(storage.getItem('testObj', null)).toEqual(testObj);
    });

    it('returns default for missing keys', () => {
      expect(storage.getItem('missing', 'default')).toBe('default');
    });

    it('removes items', () => {
      storage.setItem('toRemove', 'value');
      expect(storage.getItem('toRemove', null)).toBe('value');

      storage.removeItem('toRemove');
      expect(storage.getItem('toRemove', null)).toBe(null);
    });

    it('clears all storage', () => {
      storage.setItem('key1', 'value1');
      storage.setItem('key2', 'value2');

      storage.clear();

      expect(storage.getItem('key1', null)).toBe(null);
      expect(storage.getItem('key2', null)).toBe(null);
    });
  });

  describe('availability check', () => {
    it('checks if localStorage is available', () => {
      expect(storage.isAvailable()).toBe(true);
    });
  });

  describe('storage info', () => {
    it('provides storage information', () => {
      const info = storage.getStorageInfo();
      expect(info).toBeDefined();
      expect(typeof info.used).toBe('number');
      expect(typeof info.available).toBe('number');
    });
  });
});