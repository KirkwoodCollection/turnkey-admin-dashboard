import { sanitizer } from '../../../src/utils/sanitizer';

describe('sanitizer utilities', () => {
  describe('escapeHtml', () => {
    it('escapes HTML special characters', () => {
      expect(sanitizer.escapeHtml('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
    });

    it('escapes quotes', () => {
      expect(sanitizer.escapeHtml('"test"')).toBe('&quot;test&quot;');
      expect(sanitizer.escapeHtml("'test'")).toBe('&#039;test&#039;');
    });

    it('escapes ampersands', () => {
      expect(sanitizer.escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry');
    });
  });

  describe('stripHtml', () => {
    it('removes HTML tags', () => {
      expect(sanitizer.stripHtml('<p>Hello World</p>')).toBe('Hello World');
    });

    it('handles nested tags', () => {
      expect(sanitizer.stripHtml('<div><span>Hello</span> <em>World</em></div>')).toBe('Hello World');
    });

    it('handles empty string', () => {
      expect(sanitizer.stripHtml('')).toBe('');
    });
  });

  describe('sanitizeInput', () => {
    it('trims and escapes input', () => {
      expect(sanitizer.sanitizeInput('  <script>alert(1)</script>  ')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
    });

    it('handles non-string input', () => {
      expect(sanitizer.sanitizeInput(null as any)).toBe('');
      expect(sanitizer.sanitizeInput(123 as any)).toBe('');
    });
  });

  describe('sanitizeUrl', () => {
    it('allows http URLs', () => {
      expect(sanitizer.sanitizeUrl('http://example.com')).toBe('http://example.com');
    });

    it('allows https URLs', () => {
      expect(sanitizer.sanitizeUrl('https://example.com')).toBe('https://example.com');
    });

    it('allows relative URLs', () => {
      expect(sanitizer.sanitizeUrl('/path/to/resource')).toBe('/path/to/resource');
    });

    it('blocks javascript: URLs', () => {
      expect(sanitizer.sanitizeUrl('javascript:alert(1)')).toBe('');
    });

    it('blocks data: URLs', () => {
      expect(sanitizer.sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBe('');
    });
  });

  describe('isValidEmail', () => {
    it('validates correct email', () => {
      expect(sanitizer.isValidEmail('user@example.com')).toBe(true);
    });

    it('rejects invalid emails', () => {
      expect(sanitizer.isValidEmail('invalid-email')).toBe(false);
      expect(sanitizer.isValidEmail('@example.com')).toBe(false);
      expect(sanitizer.isValidEmail('user@')).toBe(false);
    });
  });

  describe('sanitizeFileName', () => {
    it('removes dangerous characters', () => {
      expect(sanitizer.sanitizeFileName('file<>name')).toBe('filename');
    });

    it('handles consecutive dots', () => {
      expect(sanitizer.sanitizeFileName('file...name.txt')).toBe('file.name.txt');
    });

    it('limits length', () => {
      const longName = 'a'.repeat(300);
      const result = sanitizer.sanitizeFileName(longName);
      expect(result.length).toBeLessThanOrEqual(255);
    });
  });
});