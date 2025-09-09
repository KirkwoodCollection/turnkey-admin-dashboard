// Test to demonstrate working Jest functionality with basic examples
describe('Basic Functionality Tests', () => {
  describe('formatCurrency (working implementation)', () => {
    // These should pass to demonstrate working tests
    it('formats basic currency correctly', () => {
      const { formatCurrency } = require('../../src/utils/formatters');
      
      expect(formatCurrency(123.45)).toBe('$123.45');
      expect(formatCurrency(1234.56)).toBe('$1,234.56');
      expect(formatCurrency(0)).toBe('$0.00');
      expect(formatCurrency(-123.45)).toBe('-$123.45');
    });

    it('handles invalid inputs gracefully', () => {
      const { formatCurrency } = require('../../src/utils/formatters');
      
      expect(formatCurrency(NaN)).toBe('$0.00');
      expect(formatCurrency(null as any)).toBe('$0.00');
      expect(formatCurrency(undefined as any)).toBe('$0.00');
    });
  });

  describe('formatPercentage (working implementation)', () => {
    it('formats percentages correctly', () => {
      const { formatPercentage } = require('../../src/utils/formatters');
      
      expect(formatPercentage(0.1234)).toBe('12.34%');
      expect(formatPercentage(0.5)).toBe('50.00%');
      expect(formatPercentage(1)).toBe('100.00%');
      expect(formatPercentage(0)).toBe('0.00%');
    });

    it('handles custom decimal places', () => {
      const { formatPercentage } = require('../../src/utils/formatters');
      
      expect(formatPercentage(0.1234, 1)).toBe('12.3%');
      expect(formatPercentage(0.1234, 0)).toBe('12%');
    });
  });

  describe('truncateText (working implementation)', () => {
    it('truncates text correctly', () => {
      const { truncateText } = require('../../src/utils/formatters');
      
      const longText = 'This is a very long text that needs truncation';
      const result = truncateText(longText, 20);
      
      expect(result.length).toBeLessThanOrEqual(23); // 20 + '...'
      expect(result).toContain('...');
      expect(result.startsWith('This is a very long')).toBe(true);
    });

    it('preserves short text', () => {
      const { truncateText } = require('../../src/utils/formatters');
      
      const shortText = 'Short text';
      expect(truncateText(shortText, 20)).toBe('Short text');
    });
  });

  describe('capitalizeWords (working implementation)', () => {
    it('capitalizes each word', () => {
      const { capitalizeWords } = require('../../src/utils/formatters');
      
      expect(capitalizeWords('hello world')).toBe('Hello World');
      expect(capitalizeWords('the quick brown fox')).toBe('The Quick Brown Fox');
    });

    it('handles empty strings', () => {
      const { capitalizeWords } = require('../../src/utils/formatters');
      
      expect(capitalizeWords('')).toBe('');
      expect(capitalizeWords('hello')).toBe('Hello');
    });
  });

  describe('formatNumber (working implementation)', () => {
    it('formats numbers with thousand separators', () => {
      const { formatNumber } = require('../../src/utils/formatters');
      
      expect(formatNumber(1234)).toBe('1,234');
      expect(formatNumber(1234567)).toBe('1,234,567');
      expect(formatNumber(0)).toBe('0');
    });

    it('handles decimal places', () => {
      const { formatNumber } = require('../../src/utils/formatters');
      
      expect(formatNumber(1234.56, 2)).toBe('1,234.56');
      expect(formatNumber(1234.567, 1)).toBe('1,234.6');
    });
  });
});