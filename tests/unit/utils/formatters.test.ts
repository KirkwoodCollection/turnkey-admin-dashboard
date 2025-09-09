import {
  formatCurrency,
  formatDate,
  formatTime,
  formatDateTime,
  formatRelativeTime,
  formatPercentage,
  formatDuration,
  formatFileSize,
  formatPhoneNumber,
  truncateText,
  capitalizeWords,
  formatNumber,
} from '../../../src/utils/formatters';

describe('formatters utilities', () => {
  describe('formatCurrency', () => {
    it('formats USD currency by default', () => {
      expect(formatCurrency(123.45)).toBe('$123.45');
      expect(formatCurrency(1234.56)).toBe('$1,234.56');
    });

    it('formats different currencies', () => {
      expect(formatCurrency(123.45, 'EUR')).toBe('€123.45');
      expect(formatCurrency(123.45, 'GBP')).toBe('£123.45');
    });

    it('handles zero and negative amounts', () => {
      expect(formatCurrency(0)).toBe('$0.00');
      expect(formatCurrency(-123.45)).toBe('-$123.45');
    });

    it('handles large amounts', () => {
      expect(formatCurrency(1234567.89)).toBe('$1,234,567.89');
    });

    it('rounds to specified decimal places', () => {
      expect(formatCurrency(123.456, 'USD', 2)).toBe('$123.46');
      expect(formatCurrency(123.456, 'USD', 0)).toBe('$123');
    });
  });

  describe('formatDate', () => {
    it('formats date strings', () => {
      const date = '2024-01-15T10:30:00Z';
      const result = formatDate(date);
      expect(result).toMatch(/Jan 15, 2024|1\/15\/2024/);
    });

    it('formats Date objects', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      const result = formatDate(date);
      expect(result).toMatch(/Jan 15, 2024|1\/15\/2024/);
    });

    it('handles custom formats', () => {
      const date = '2024-01-15T10:30:00Z';
      expect(formatDate(date, 'short')).toMatch(/1\/15\/24|15\/1\/24/);
      expect(formatDate(date, 'long')).toMatch(/January 15, 2024/);
    });

    it('handles invalid dates', () => {
      expect(formatDate('invalid-date')).toBe('Invalid Date');
      expect(formatDate(null as any)).toBe('Invalid Date');
    });
  });

  describe('formatTime', () => {
    it('formats time from date strings', () => {
      const dateTime = '2024-01-15T14:30:00Z';
      const result = formatTime(dateTime);
      expect(result).toMatch(/\d{1,2}:\d{2}:\d{2}\s?(AM|PM)|2:30:00\s?PM/);
    });

    it('formats 24-hour time', () => {
      const dateTime = '2024-01-15T14:30:00Z';
      const result = formatTime(dateTime, true);
      expect(result).toMatch(/14:30:00/);
    });

    it('handles seconds display', () => {
      const dateTime = '2024-01-15T14:30:45Z';
      const withSeconds = formatTime(dateTime, false, true);
      const withoutSeconds = formatTime(dateTime, false, false);
      
      expect(withSeconds).toContain('45');
      expect(withoutSeconds).not.toContain('45');
    });
  });

  describe('formatDateTime', () => {
    it('combines date and time formatting', () => {
      const dateTime = '2024-01-15T14:30:00Z';
      const result = formatDateTime(dateTime);
      expect(result).toMatch(/Jan 15, 2024.*2:30/);
    });

    it('uses custom separators', () => {
      const dateTime = '2024-01-15T14:30:00Z';
      const result = formatDateTime(dateTime, ' at ');
      expect(result).toContain(' at ');
    });
  });

  describe('formatRelativeTime', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-15T12:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('formats recent times', () => {
      const oneMinuteAgo = new Date('2024-01-15T11:59:00Z');
      expect(formatRelativeTime(oneMinuteAgo)).toMatch(/1 minute ago|just now/);
      
      const fiveMinutesAgo = new Date('2024-01-15T11:55:00Z');
      expect(formatRelativeTime(fiveMinutesAgo)).toContain('5 minutes ago');
    });

    it('formats hours and days', () => {
      const twoHoursAgo = new Date('2024-01-15T10:00:00Z');
      expect(formatRelativeTime(twoHoursAgo)).toContain('2 hours ago');
      
      const yesterday = new Date('2024-01-14T12:00:00Z');
      expect(formatRelativeTime(yesterday)).toContain('1 day ago');
    });

    it('handles future dates', () => {
      const inTwoHours = new Date('2024-01-15T14:00:00Z');
      expect(formatRelativeTime(inTwoHours)).toMatch(/in 2 hours|2 hours from now/);
    });

    it('falls back to absolute date for old dates', () => {
      const oldDate = new Date('2023-01-15T12:00:00Z');
      const result = formatRelativeTime(oldDate);
      expect(result).toMatch(/Jan 15, 2023|1\/15\/2023/);
    });
  });

  describe('formatPercentage', () => {
    it('formats percentages with default precision', () => {
      expect(formatPercentage(0.1234)).toBe('12.34%');
      expect(formatPercentage(0.5)).toBe('50.00%');
    });

    it('handles custom decimal places', () => {
      expect(formatPercentage(0.1234, 1)).toBe('12.3%');
      expect(formatPercentage(0.1234, 0)).toBe('12%');
    });

    it('handles edge cases', () => {
      expect(formatPercentage(0)).toBe('0.00%');
      expect(formatPercentage(1)).toBe('100.00%');
      expect(formatPercentage(1.5)).toBe('150.00%');
    });

    it('handles already-percentage values', () => {
      expect(formatPercentage(12.34, 2, true)).toBe('12.34%');
    });
  });

  describe('formatDuration', () => {
    it('formats seconds', () => {
      expect(formatDuration(45)).toBe('45 seconds');
      expect(formatDuration(1)).toBe('1 second');
    });

    it('formats minutes and seconds', () => {
      expect(formatDuration(125)).toBe('2 minutes, 5 seconds');
      expect(formatDuration(60)).toBe('1 minute');
    });

    it('formats hours, minutes, and seconds', () => {
      expect(formatDuration(3665)).toBe('1 hour, 1 minute, 5 seconds');
      expect(formatDuration(3600)).toBe('1 hour');
    });

    it('formats days', () => {
      expect(formatDuration(90061)).toBe('1 day, 1 hour, 1 minute, 1 second');
      expect(formatDuration(86400)).toBe('1 day');
    });

    it('uses short format', () => {
      expect(formatDuration(3665, true)).toBe('1h 1m 5s');
      expect(formatDuration(90061, true)).toBe('1d 1h 1m 1s');
    });

    it('handles zero duration', () => {
      expect(formatDuration(0)).toBe('0 seconds');
    });
  });

  describe('formatFileSize', () => {
    it('formats bytes', () => {
      expect(formatFileSize(512)).toBe('512 B');
      expect(formatFileSize(1023)).toBe('1023 B');
    });

    it('formats kilobytes', () => {
      expect(formatFileSize(1024)).toBe('1.0 KB');
      expect(formatFileSize(1536)).toBe('1.5 KB');
    });

    it('formats megabytes', () => {
      expect(formatFileSize(1048576)).toBe('1.0 MB');
      expect(formatFileSize(1572864)).toBe('1.5 MB');
    });

    it('formats gigabytes and beyond', () => {
      expect(formatFileSize(1073741824)).toBe('1.0 GB');
      expect(formatFileSize(1099511627776)).toBe('1.0 TB');
    });

    it('uses custom decimal places', () => {
      expect(formatFileSize(1536, 2)).toBe('1.50 KB');
      expect(formatFileSize(1536, 0)).toBe('2 KB');
    });

    it('handles zero size', () => {
      expect(formatFileSize(0)).toBe('0 B');
    });
  });

  describe('formatPhoneNumber', () => {
    it('formats US phone numbers', () => {
      expect(formatPhoneNumber('1234567890')).toBe('(123) 456-7890');
      expect(formatPhoneNumber('12345678901')).toBe('+1 (234) 567-8901');
    });

    it('handles different formats', () => {
      expect(formatPhoneNumber('123-456-7890')).toBe('(123) 456-7890');
      expect(formatPhoneNumber('(123) 456-7890')).toBe('(123) 456-7890');
    });

    it('handles international numbers', () => {
      const result = formatPhoneNumber('441234567890', 'GB');
      expect(result).toMatch(/\+44.*123.*456.*7890/);
    });

    it('handles invalid numbers', () => {
      expect(formatPhoneNumber('invalid')).toBe('invalid');
      expect(formatPhoneNumber('123')).toBe('123');
    });
  });

  describe('truncateText', () => {
    it('truncates long text', () => {
      const longText = 'This is a very long text that needs to be truncated';
      const result = truncateText(longText, 20);
      expect(result).toBe('This is a very long...');
      expect(result.length).toBeLessThanOrEqual(23); // 20 + '...'
    });

    it('preserves short text', () => {
      const shortText = 'Short text';
      const result = truncateText(shortText, 20);
      expect(result).toBe('Short text');
    });

    it('uses custom suffix', () => {
      const longText = 'This is a very long text';
      const result = truncateText(longText, 10, ' [more]');
      expect(result).toContain('[more]');
    });

    it('handles word boundaries', () => {
      const text = 'This is a sentence with words';
      const result = truncateText(text, 15, '...', true);
      expect(result).toBe('This is a...');
    });

    it('handles edge cases', () => {
      expect(truncateText('', 10)).toBe('');
      expect(truncateText('text', 10)).toBe('text');
      expect(truncateText('text', 0)).toBe('');
    });
  });

  describe('capitalizeWords', () => {
    it('capitalizes each word', () => {
      expect(capitalizeWords('hello world')).toBe('Hello World');
      expect(capitalizeWords('the quick brown fox')).toBe('The Quick Brown Fox');
    });

    it('handles single words', () => {
      expect(capitalizeWords('hello')).toBe('Hello');
    });

    it('preserves existing capitalization selectively', () => {
      expect(capitalizeWords('hELLO wORLD')).toBe('Hello World');
    });

    it('handles empty strings', () => {
      expect(capitalizeWords('')).toBe('');
    });

    it('handles multiple spaces', () => {
      expect(capitalizeWords('hello  world')).toBe('Hello  World');
    });

    it('handles special characters', () => {
      expect(capitalizeWords('hello-world')).toBe('Hello-world');
      expect(capitalizeWords("o'connor")).toBe("O'connor");
    });
  });

  describe('formatNumber', () => {
    it('formats with thousand separators', () => {
      expect(formatNumber(1234)).toBe('1,234');
      expect(formatNumber(1234567)).toBe('1,234,567');
    });

    it('handles decimal places', () => {
      expect(formatNumber(1234.56, 2)).toBe('1,234.56');
      expect(formatNumber(1234.567, 1)).toBe('1,234.6');
    });

    it('handles different locales', () => {
      const result = formatNumber(1234.56, 2, 'de-DE');
      expect(result).toMatch(/1\.234,56|1,234.56/); // German format uses dots for thousands, commas for decimals
    });

    it('handles zero and negative numbers', () => {
      expect(formatNumber(0)).toBe('0');
      expect(formatNumber(-1234)).toBe('-1,234');
    });

    it('handles very large numbers', () => {
      expect(formatNumber(1234567890123)).toBe('1,234,567,890,123');
    });
  });

  describe('edge cases and error handling', () => {
    it('handles null and undefined inputs gracefully', () => {
      expect(formatCurrency(null as any)).toBe('$0.00');
      expect(formatDate(null as any)).toBe('Invalid Date');
      expect(formatPercentage(null as any)).toBe('0.00%');
    });

    it('handles invalid numeric inputs', () => {
      expect(formatCurrency(NaN)).toBe('$NaN');
      expect(formatPercentage(Infinity)).toBe('Infinity%');
    });

    it('handles extremely large and small numbers', () => {
      expect(formatFileSize(Number.MAX_SAFE_INTEGER)).toMatch(/\d+(\.\d+)?\s[KMGTPE]B/);
      expect(formatDuration(Number.MAX_SAFE_INTEGER)).toContain('day');
    });

    it('handles unicode and special characters', () => {
      expect(capitalizeWords('café naïve')).toBe('Café Naïve');
      expect(truncateText('émoji 🎉 text', 10)).toBe('émoji 🎉...');
    });
  });
});