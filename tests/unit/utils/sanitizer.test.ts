import {
  sanitizeString,
  sanitizeEmail,
  sanitizeUrl,
  sanitizeNumber,
  sanitizeObject,
  validateInput,
  escapeHtml,
  removeScripts,
} from '../../../src/utils/sanitizer';

describe('sanitizer utilities', () => {
  describe('sanitizeString', () => {
    it('removes HTML tags', () => {
      const input = '<script>alert("xss")</script>Hello World';
      const result = sanitizeString(input);
      expect(result).toBe('Hello World');
    });

    it('removes dangerous attributes', () => {
      const input = '<div onclick="alert(1)">Content</div>';
      const result = sanitizeString(input);
      expect(result).toBe('Content');
    });

    it('preserves safe HTML tags', () => {
      const input = '<p>Hello <strong>World</strong></p>';
      const result = sanitizeString(input, { allowHtml: true });
      expect(result).toBe('<p>Hello <strong>World</strong></p>');
    });

    it('trims whitespace', () => {
      const input = '  Hello World  ';
      const result = sanitizeString(input);
      expect(result).toBe('Hello World');
    });

    it('limits string length', () => {
      const input = 'This is a very long string that exceeds the limit';
      const result = sanitizeString(input, { maxLength: 20 });
      expect(result).toBe('This is a very long');
      expect(result.length).toBe(20);
    });

    it('handles empty strings', () => {
      expect(sanitizeString('')).toBe('');
      expect(sanitizeString('   ')).toBe('');
    });

    it('handles null and undefined', () => {
      expect(sanitizeString(null as any)).toBe('');
      expect(sanitizeString(undefined as any)).toBe('');
    });
  });

  describe('sanitizeEmail', () => {
    it('validates correct email format', () => {
      const email = 'user@example.com';
      const result = sanitizeEmail(email);
      expect(result).toBe('user@example.com');
    });

    it('converts to lowercase', () => {
      const email = 'USER@EXAMPLE.COM';
      const result = sanitizeEmail(email);
      expect(result).toBe('user@example.com');
    });

    it('trims whitespace', () => {
      const email = '  user@example.com  ';
      const result = sanitizeEmail(email);
      expect(result).toBe('user@example.com');
    });

    it('rejects invalid email formats', () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'user@',
        'user..name@example.com',
        'user@.com',
      ];

      invalidEmails.forEach(email => {
        expect(() => sanitizeEmail(email)).toThrow('Invalid email format');
      });
    });

    it('rejects emails with dangerous content', () => {
      const dangerousEmail = 'user+<script>@example.com';
      expect(() => sanitizeEmail(dangerousEmail)).toThrow('Invalid email format');
    });

    it('handles internationalized domains', () => {
      const email = 'user@münchen.de';
      const result = sanitizeEmail(email);
      expect(result).toBe('user@münchen.de');
    });
  });

  describe('sanitizeUrl', () => {
    it('validates HTTP URLs', () => {
      const url = 'http://example.com/path';
      const result = sanitizeUrl(url);
      expect(result).toBe('http://example.com/path');
    });

    it('validates HTTPS URLs', () => {
      const url = 'https://example.com/path';
      const result = sanitizeUrl(url);
      expect(result).toBe('https://example.com/path');
    });

    it('rejects javascript: URLs', () => {
      const url = 'javascript:alert(1)';
      expect(() => sanitizeUrl(url)).toThrow('Invalid URL protocol');
    });

    it('rejects data: URLs by default', () => {
      const url = 'data:text/html,<script>alert(1)</script>';
      expect(() => sanitizeUrl(url)).toThrow('Invalid URL protocol');
    });

    it('allows whitelisted protocols', () => {
      const url = 'ftp://example.com/file.txt';
      const result = sanitizeUrl(url, { allowedProtocols: ['http', 'https', 'ftp'] });
      expect(result).toBe('ftp://example.com/file.txt');
    });

    it('removes query parameters when specified', () => {
      const url = 'https://example.com/path?param=value&other=123';
      const result = sanitizeUrl(url, { removeQuery: true });
      expect(result).toBe('https://example.com/path');
    });

    it('removes fragments when specified', () => {
      const url = 'https://example.com/path#section';
      const result = sanitizeUrl(url, { removeFragment: true });
      expect(result).toBe('https://example.com/path');
    });

    it('handles malformed URLs', () => {
      const malformedUrls = [
        'http://',
        'https://.',
        'not-a-url',
        '',
      ];

      malformedUrls.forEach(url => {
        expect(() => sanitizeUrl(url)).toThrow();
      });
    });
  });

  describe('sanitizeNumber', () => {
    it('converts string numbers to numbers', () => {
      expect(sanitizeNumber('123')).toBe(123);
      expect(sanitizeNumber('123.45')).toBe(123.45);
    });

    it('handles negative numbers', () => {
      expect(sanitizeNumber('-123')).toBe(-123);
      expect(sanitizeNumber(-456)).toBe(-456);
    });

    it('enforces minimum values', () => {
      const result = sanitizeNumber(-10, { min: 0 });
      expect(result).toBe(0);
    });

    it('enforces maximum values', () => {
      const result = sanitizeNumber(100, { max: 50 });
      expect(result).toBe(50);
    });

    it('rounds to specified decimal places', () => {
      const result = sanitizeNumber(123.456789, { decimals: 2 });
      expect(result).toBe(123.46);
    });

    it('handles integer-only constraint', () => {
      const result = sanitizeNumber(123.45, { integer: true });
      expect(result).toBe(123);
    });

    it('throws on invalid numbers', () => {
      const invalidNumbers = ['abc', '', NaN, Infinity, -Infinity];
      
      invalidNumbers.forEach(num => {
        expect(() => sanitizeNumber(num as any)).toThrow('Invalid number');
      });
    });

    it('handles edge cases', () => {
      expect(sanitizeNumber(0)).toBe(0);
      expect(sanitizeNumber('0')).toBe(0);
      expect(sanitizeNumber(0.1 + 0.2, { decimals: 1 })).toBe(0.3);
    });
  });

  describe('sanitizeObject', () => {
    it('sanitizes object properties', () => {
      const input = {
        name: '<script>alert(1)</script>John',
        email: '  USER@EXAMPLE.COM  ',
        age: '25',
      };

      const schema = {
        name: { type: 'string' as const },
        email: { type: 'email' as const },
        age: { type: 'number' as const },
      };

      const result = sanitizeObject(input, schema);
      
      expect(result.name).toBe('John');
      expect(result.email).toBe('user@example.com');
      expect(result.age).toBe(25);
    });

    it('removes unknown properties', () => {
      const input = {
        name: 'John',
        unknown: 'value',
        age: 25,
      };

      const schema = {
        name: { type: 'string' as const },
        age: { type: 'number' as const },
      };

      const result = sanitizeObject(input, schema);
      
      expect(result.name).toBe('John');
      expect(result.age).toBe(25);
      expect('unknown' in result).toBe(false);
    });

    it('handles optional properties', () => {
      const input = {
        name: 'John',
      };

      const schema = {
        name: { type: 'string' as const },
        age: { type: 'number' as const, optional: true },
      };

      const result = sanitizeObject(input, schema);
      
      expect(result.name).toBe('John');
      expect('age' in result).toBe(false);
    });

    it('applies default values', () => {
      const input = {
        name: 'John',
      };

      const schema = {
        name: { type: 'string' as const },
        age: { type: 'number' as const, default: 18 },
        active: { type: 'boolean' as const, default: true },
      };

      const result = sanitizeObject(input, schema);
      
      expect(result.name).toBe('John');
      expect(result.age).toBe(18);
      expect(result.active).toBe(true);
    });

    it('validates required properties', () => {
      const input = {
        name: 'John',
      };

      const schema = {
        name: { type: 'string' as const },
        email: { type: 'email' as const, required: true },
      };

      expect(() => sanitizeObject(input, schema)).toThrow('Required property missing: email');
    });

    it('handles nested objects', () => {
      const input = {
        user: {
          name: '<b>John</b>',
          profile: {
            bio: 'Hello world',
          },
        },
      };

      const schema = {
        user: {
          type: 'object' as const,
          properties: {
            name: { type: 'string' as const },
            profile: {
              type: 'object' as const,
              properties: {
                bio: { type: 'string' as const },
              },
            },
          },
        },
      };

      const result = sanitizeObject(input, schema);
      
      expect(result.user.name).toBe('John');
      expect(result.user.profile.bio).toBe('Hello world');
    });
  });

  describe('validateInput', () => {
    it('validates string length', () => {
      expect(validateInput('Hello', 'string', { minLength: 3, maxLength: 10 })).toBe(true);
      expect(validateInput('Hi', 'string', { minLength: 3 })).toBe(false);
      expect(validateInput('Very long string', 'string', { maxLength: 10 })).toBe(false);
    });

    it('validates number ranges', () => {
      expect(validateInput(25, 'number', { min: 18, max: 65 })).toBe(true);
      expect(validateInput(10, 'number', { min: 18 })).toBe(false);
      expect(validateInput(70, 'number', { max: 65 })).toBe(false);
    });

    it('validates regex patterns', () => {
      const phonePattern = /^\d{3}-\d{3}-\d{4}$/;
      expect(validateInput('123-456-7890', 'string', { pattern: phonePattern })).toBe(true);
      expect(validateInput('invalid-phone', 'string', { pattern: phonePattern })).toBe(false);
    });

    it('validates enum values', () => {
      const allowedValues = ['red', 'green', 'blue'];
      expect(validateInput('red', 'string', { enum: allowedValues })).toBe(true);
      expect(validateInput('yellow', 'string', { enum: allowedValues })).toBe(false);
    });
  });

  describe('escapeHtml', () => {
    it('escapes HTML special characters', () => {
      const input = '<script>alert("xss")</script>';
      const result = escapeHtml(input);
      expect(result).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    });

    it('escapes ampersands', () => {
      const input = 'Tom & Jerry';
      const result = escapeHtml(input);
      expect(result).toBe('Tom &amp; Jerry');
    });

    it('handles empty strings', () => {
      expect(escapeHtml('')).toBe('');
    });

    it('handles strings without special characters', () => {
      const input = 'Normal text';
      const result = escapeHtml(input);
      expect(result).toBe('Normal text');
    });
  });

  describe('removeScripts', () => {
    it('removes script tags', () => {
      const input = 'Hello <script>alert(1)</script> World';
      const result = removeScripts(input);
      expect(result).toBe('Hello  World');
    });

    it('removes event handlers', () => {
      const input = '<div onclick="alert(1)">Content</div>';
      const result = removeScripts(input);
      expect(result).toBe('<div>Content</div>');
    });

    it('removes javascript: URLs', () => {
      const input = '<a href="javascript:alert(1)">Link</a>';
      const result = removeScripts(input);
      expect(result).toBe('<a href="#">Link</a>');
    });

    it('removes data: URLs with scripts', () => {
      const input = '<img src="data:text/html,<script>alert(1)</script>">';
      const result = removeScripts(input);
      expect(result).toBe('<img src="">');
    });

    it('preserves safe content', () => {
      const input = '<p>Hello <strong>World</strong></p>';
      const result = removeScripts(input);
      expect(result).toBe('<p>Hello <strong>World</strong></p>');
    });
  });

  describe('edge cases and security', () => {
    it('handles deeply nested malicious content', () => {
      const input = '<div><span><script>alert(1)</script></span></div>';
      const result = sanitizeString(input);
      expect(result).not.toContain('script');
      expect(result).not.toContain('alert');
    });

    it('handles encoded malicious content', () => {
      const input = '&lt;script&gt;alert(1)&lt;/script&gt;';
      const result = sanitizeString(input);
      expect(result).not.toContain('alert');
    });

    it('handles very long inputs efficiently', () => {
      const longString = 'a'.repeat(100000);
      const startTime = Date.now();
      const result = sanitizeString(longString, { maxLength: 1000 });
      const endTime = Date.now();
      
      expect(result.length).toBe(1000);
      expect(endTime - startTime).toBeLessThan(100); // Should be fast
    });

    it('handles null bytes and control characters', () => {
      const input = 'Hello\x00\x01\x02World';
      const result = sanitizeString(input);
      expect(result).toBe('HelloWorld');
    });

    it('prevents prototype pollution', () => {
      const maliciousInput = {
        '__proto__': { polluted: true },
        'constructor': { prototype: { polluted: true } },
        name: 'John',
      };

      const schema = {
        name: { type: 'string' as const },
      };

      const result = sanitizeObject(maliciousInput, schema);
      
      expect(result.name).toBe('John');
      expect('__proto__' in result).toBe(false);
      expect('constructor' in result).toBe(false);
      expect((Object.prototype as any).polluted).toBeUndefined();
    });
  });
});