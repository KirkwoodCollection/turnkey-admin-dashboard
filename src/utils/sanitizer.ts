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