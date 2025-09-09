import { format, parseISO, isValid } from 'date-fns';

export const dateHelpers = {
  /**
   * Format a date string or Date object to a readable format
   */
  formatDate(date: string | Date, formatStr = 'MMM dd, yyyy'): string {
    try {
      const dateObj = typeof date === 'string' ? parseISO(date) : date;
      if (!isValid(dateObj)) return 'Invalid Date';
      return format(dateObj, formatStr);
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'Invalid Date';
    }
  },

  /**
   * Format a date to time only
   */
  formatTime(date: string | Date, formatStr = 'HH:mm'): string {
    try {
      const dateObj = typeof date === 'string' ? parseISO(date) : date;
      if (!isValid(dateObj)) return 'Invalid Time';
      return format(dateObj, formatStr);
    } catch (error) {
      console.error('Time formatting error:', error);
      return 'Invalid Time';
    }
  },

  /**
   * Format a date to datetime
   */
  formatDateTime(date: string | Date, formatStr = 'MMM dd, yyyy HH:mm'): string {
    try {
      const dateObj = typeof date === 'string' ? parseISO(date) : date;
      if (!isValid(dateObj)) return 'Invalid DateTime';
      return format(dateObj, formatStr);
    } catch (error) {
      console.error('DateTime formatting error:', error);
      return 'Invalid DateTime';
    }
  },

  /**
   * Get relative time string (e.g., "2 minutes ago")
   */
  getRelativeTime(date: string | Date): string {
    try {
      const dateObj = typeof date === 'string' ? parseISO(date) : date;
      if (!isValid(dateObj)) return 'Invalid Date';
      
      const now = new Date();
      const diffMs = now.getTime() - dateObj.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 1) return 'just now';
      if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
      if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
      if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
      
      return this.formatDate(dateObj);
    } catch (error) {
      console.error('Relative time error:', error);
      return 'Unknown';
    }
  },

  /**
   * Check if a date is today
   */
  isToday(date: string | Date): boolean {
    try {
      const dateObj = typeof date === 'string' ? parseISO(date) : date;
      if (!isValid(dateObj)) return false;
      
      const today = new Date();
      return format(dateObj, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
    } catch (error) {
      return false;
    }
  },

  /**
   * Get date range for a given period
   */
  getDateRange(period: string): { start: Date; end: Date } {
    const end = new Date();
    let start: Date;

    switch (period) {
      case '1h':
        start = new Date(end.getTime() - 60 * 60 * 1000);
        break;
      case '6h':
        start = new Date(end.getTime() - 6 * 60 * 60 * 1000);
        break;
      case '12h':
        start = new Date(end.getTime() - 12 * 60 * 60 * 1000);
        break;
      case '24h':
        start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
    }

    return { start, end };
  }
};