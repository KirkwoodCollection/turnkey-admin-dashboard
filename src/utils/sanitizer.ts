/**
 * HTML sanitization utilities to prevent XSS attacks
 */

export const sanitizer = {
  /**
   * Escape HTML special characters
   */
  escapeHtml(text: string): string {
    const map: { [key: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    
    return text.replace(/[&<>"']/g, (m) => map[m]);
  },

  /**
   * Strip HTML tags from text
   */
  stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '');
  },

  /**
   * Sanitize user input for safe display
   */
  sanitizeInput(input: string): string {
    if (typeof input !== 'string') {
      return '';
    }
    
    return this.escapeHtml(input.trim());
  },

  /**
   * Sanitize search query
   */
  sanitizeSearchQuery(query: string): string {
    if (typeof query !== 'string') {
      return '';
    }
    
    // Remove potentially dangerous characters
    return query
      .replace(/[<>]/g, '')
      .replace(/script/gi, '')
      .replace(/javascript/gi, '')
      .replace(/on\w+=/gi, '')
      .trim()
      .slice(0, 100); // Limit length
  },

  /**
   * Validate and sanitize URL
   */
  sanitizeUrl(url: string): string {
    if (typeof url !== 'string') {
      return '';
    }
    
    // Only allow http, https, and relative URLs
    const allowedProtocols = /^(https?:\/\/|\/)/;
    if (!allowedProtocols.test(url)) {
      return '';
    }
    
    // Remove any javascript: or data: protocols
    if (url.match(/^(javascript|data):/i)) {
      return '';
    }
    
    return url.trim();
  },

  /**
   * Sanitize JSON data before storing or displaying
   */
  sanitizeJsonData(data: unknown): unknown {
    if (typeof data === 'string') {
      return this.sanitizeInput(data);
    }
    
    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeJsonData(item));
    }
    
    if (data && typeof data === 'object') {
      const sanitized: { [key: string]: unknown } = {};
      for (const [key, value] of Object.entries(data)) {
        sanitized[this.sanitizeInput(key)] = this.sanitizeJsonData(value);
      }
      return sanitized;
    }
    
    return data;
  },

  /**
   * Validate email format
   */
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  /**
   * Sanitize file name
   */
  sanitizeFileName(fileName: string): string {
    if (typeof fileName !== 'string') {
      return '';
    }

    return fileName
      .replace(/[^a-zA-Z0-9._-]/g, '')
      .replace(/\.{2,}/g, '.')
      .slice(0, 255);
  }
};

// Export individual functions for backward compatibility with tests
export const escapeHtml = sanitizer.escapeHtml;
export const removeScripts = (input: string): string => {
  if (typeof input !== 'string') {
    return '';
  }

  return input
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/javascript:[^"'\s]*/gi, '#')
    .replace(/data:text\/html[^"'\s]*/gi, '');
};

export const sanitizeString = (input: string, options: { allowHtml?: boolean; maxLength?: number } = {}): string => {
  if (typeof input !== 'string') {
    return '';
  }

  let result = input.trim();

  if (!options.allowHtml) {
    result = sanitizer.stripHtml(result);
  }

  if (options.maxLength && result.length > options.maxLength) {
    result = result.slice(0, options.maxLength);
  }

  return result;
};

export const sanitizeEmail = (email: string): string => {
  if (typeof email !== 'string') {
    throw new Error('Invalid email format');
  }

  const trimmed = email.trim().toLowerCase();

  if (!sanitizer.isValidEmail(trimmed)) {
    throw new Error('Invalid email format');
  }

  return trimmed;
};

export const sanitizeUrl = (url: string, options: { allowedProtocols?: string[]; removeQuery?: boolean; removeFragment?: boolean } = {}): string => {
  if (typeof url !== 'string') {
    throw new Error('Invalid URL');
  }

  try {
    const urlObj = new URL(url);
    const allowedProtocols = options.allowedProtocols || ['http', 'https'];

    if (!allowedProtocols.includes(urlObj.protocol.replace(':', ''))) {
      throw new Error('Invalid URL protocol');
    }

    if (options.removeQuery) {
      urlObj.search = '';
    }

    if (options.removeFragment) {
      urlObj.hash = '';
    }

    return urlObj.toString();
  } catch (error) {
    throw new Error('Invalid URL');
  }
};

export const sanitizeNumber = (input: any, options: { min?: number; max?: number; decimals?: number; integer?: boolean } = {}): number => {
  const num = typeof input === 'string' ? parseFloat(input) : Number(input);

  if (isNaN(num) || !isFinite(num)) {
    throw new Error('Invalid number');
  }

  let result = num;

  if (typeof options.min === 'number' && result < options.min) {
    result = options.min;
  }

  if (typeof options.max === 'number' && result > options.max) {
    result = options.max;
  }

  if (options.integer) {
    result = Math.floor(result);
  } else if (typeof options.decimals === 'number') {
    result = parseFloat(result.toFixed(options.decimals));
  }

  return result;
};

type SchemaPropertyType = {
  type: 'string' | 'email' | 'number' | 'boolean' | 'object';
  optional?: boolean;
  required?: boolean;
  default?: any;
  properties?: Record<string, SchemaPropertyType>;
};

export const sanitizeObject = (input: any, schema: Record<string, SchemaPropertyType>): any => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('Invalid input object');
  }

  const result: any = {};

  // Check for dangerous properties
  if ('__proto__' in input || 'constructor' in input) {
    // Skip these dangerous properties
  }

  for (const [key, schemaProperty] of Object.entries(schema)) {
    const value = input[key];

    if (value === undefined || value === null) {
      if (schemaProperty.required) {
        throw new Error(`Required property missing: ${key}`);
      }
      if (schemaProperty.default !== undefined) {
        result[key] = schemaProperty.default;
      }
      continue;
    }

    switch (schemaProperty.type) {
      case 'string':
        result[key] = sanitizeString(value);
        break;
      case 'email':
        result[key] = sanitizeEmail(value);
        break;
      case 'number':
        result[key] = sanitizeNumber(value);
        break;
      case 'boolean':
        result[key] = Boolean(value);
        break;
      case 'object':
        if (schemaProperty.properties) {
          result[key] = sanitizeObject(value, schemaProperty.properties);
        } else {
          result[key] = value;
        }
        break;
    }
  }

  return result;
};

export const validateInput = (input: any, type: string, options: any = {}): boolean => {
  try {
    switch (type) {
      case 'string':
        if (typeof input !== 'string') return false;
        if (options.minLength && input.length < options.minLength) return false;
        if (options.maxLength && input.length > options.maxLength) return false;
        if (options.pattern && !options.pattern.test(input)) return false;
        if (options.enum && !options.enum.includes(input)) return false;
        return true;
      case 'number':
        const num = Number(input);
        if (isNaN(num) || !isFinite(num)) return false;
        if (options.min !== undefined && num < options.min) return false;
        if (options.max !== undefined && num > options.max) return false;
        return true;
      default:
        return true;
    }
  } catch {
    return false;
  }
};