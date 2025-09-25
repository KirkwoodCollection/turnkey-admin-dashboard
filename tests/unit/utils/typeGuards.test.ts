import { safeArray, safeObject, getMetricsValue } from '../../../src/utils/typeGuards';

describe('typeGuards utilities', () => {
  describe('safeArray', () => {
    it('returns array when input is array', () => {
      const input = [1, 2, 3];
      expect(safeArray(input)).toEqual([1, 2, 3]);
    });

    it('returns empty array when input is null', () => {
      expect(safeArray(null)).toEqual([]);
    });

    it('returns empty array when input is undefined', () => {
      expect(safeArray(undefined)).toEqual([]);
    });

    it('returns empty array when input is not array', () => {
      expect(safeArray('string')).toEqual([]);
      expect(safeArray(123)).toEqual([]);
      expect(safeArray({})).toEqual([]);
    });
  });

  describe('safeObject', () => {
    it('returns object when input is object', () => {
      const input = { key: 'value' };
      expect(safeObject(input)).toEqual({ key: 'value' });
    });

    it('returns empty object when input is null', () => {
      expect(safeObject(null)).toEqual({});
    });

    it('returns empty object when input is undefined', () => {
      expect(safeObject(undefined)).toEqual({});
    });

    it('returns empty object when input is array', () => {
      expect(safeObject([1, 2, 3])).toEqual({});
    });

    it('returns empty object when input is not object', () => {
      expect(safeObject('string')).toEqual({});
      expect(safeObject(123)).toEqual({});
    });
  });

  describe('getMetricsValue', () => {
    it('returns value when key exists', () => {
      const metrics = { active_sessions: 42 };
      expect(getMetricsValue(metrics, 'active_sessions')).toBe(42);
    });

    it('returns default when key missing', () => {
      const metrics = { active_sessions: 42 };
      expect(getMetricsValue(metrics, 'missing_key', 100)).toBe(100);
    });

    it('returns 0 when no default provided and key missing', () => {
      const metrics = { active_sessions: 42 };
      expect(getMetricsValue(metrics, 'missing_key')).toBe(0);
    });

    it('handles null metrics safely', () => {
      expect(getMetricsValue(null, 'key', 999)).toBe(999);
    });

    it('handles undefined metrics safely', () => {
      expect(getMetricsValue(undefined, 'key')).toBe(0);
    });
  });
});