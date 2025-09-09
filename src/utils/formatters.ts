/**
 * Utility functions for formatting various data types in the dashboard
 */

export const formatCurrency = (
  amount: number,
  currency: string = 'USD',
  decimals: number = 2
): string => {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return '$0.00';
  }

  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return formatter.format(amount);
};

export const formatDate = (
  date: string | Date,
  format: 'short' | 'medium' | 'long' = 'medium'
): string => {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    if (isNaN(dateObj.getTime())) {
      return 'Invalid Date';
    }

    const options = {
      short: { month: 'numeric', day: 'numeric', year: '2-digit' } as Intl.DateTimeFormatOptions,
      medium: { month: 'short', day: 'numeric', year: 'numeric' } as Intl.DateTimeFormatOptions,
      long: { month: 'long', day: 'numeric', year: 'numeric' } as Intl.DateTimeFormatOptions,
    };

    return dateObj.toLocaleDateString('en-US', options[format]);
  } catch {
    return 'Invalid Date';
  }
};

export const formatTime = (
  date: string | Date,
  use24Hour: boolean = false,
  includeSeconds: boolean = true
): string => {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    if (isNaN(dateObj.getTime())) {
      return 'Invalid Time';
    }

    const options: Intl.DateTimeFormatOptions = {
      hour: 'numeric',
      minute: '2-digit',
      hour12: !use24Hour,
    };

    if (includeSeconds) {
      options.second = '2-digit';
    }

    return dateObj.toLocaleTimeString('en-US', options);
  } catch {
    return 'Invalid Time';
  }
};

export const formatDateTime = (
  date: string | Date,
  separator: string = ' at '
): string => {
  const formattedDate = formatDate(date);
  const formattedTime = formatTime(date, false, false);
  
  if (formattedDate === 'Invalid Date' || formattedTime === 'Invalid Time') {
    return 'Invalid DateTime';
  }

  return `${formattedDate}${separator}${formattedTime}`;
};

export const formatRelativeTime = (date: string | Date): string => {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffMs = now.getTime() - dateObj.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) {
      return 'just now';
    } else if (diffMinutes < 60) {
      return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    } else {
      return formatDate(date);
    }
  } catch {
    return 'Invalid Date';
  }
};

export const formatPercentage = (
  value: number,
  decimals: number = 2,
  isAlreadyPercentage: boolean = false
): string => {
  if (typeof value !== 'number' || isNaN(value)) {
    return '0.00%';
  }

  const percentage = isAlreadyPercentage ? value : value * 100;
  return `${percentage.toFixed(decimals)}%`;
};

export const formatDuration = (seconds: number, short: boolean = false): string => {
  if (typeof seconds !== 'number' || isNaN(seconds) || seconds < 0) {
    return '0 seconds';
  }

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  const parts = [];

  if (days > 0) {
    parts.push(`${days}${short ? 'd' : ` day${days === 1 ? '' : 's'}`}`);
  }
  if (hours > 0) {
    parts.push(`${hours}${short ? 'h' : ` hour${hours === 1 ? '' : 's'}`}`);
  }
  if (minutes > 0) {
    parts.push(`${minutes}${short ? 'm' : ` minute${minutes === 1 ? '' : 's'}`}`);
  }
  if (remainingSeconds > 0 || parts.length === 0) {
    parts.push(`${remainingSeconds}${short ? 's' : ` second${remainingSeconds === 1 ? '' : 's'}`}`);
  }

  return short ? parts.join(' ') : parts.join(', ');
};

export const formatFileSize = (bytes: number, decimals: number = 1): string => {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

export const formatPhoneNumber = (
  phone: string,
  _countryCode: string = 'US'
): string => {
  // Simple US phone number formatting
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  } else if (cleaned.length === 11 && cleaned[0] === '1') {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  
  return phone; // Return original if can't format
};

export const truncateText = (
  text: string,
  length: number,
  suffix: string = '...',
  wordBoundary: boolean = false
): string => {
  if (!text || text.length <= length) {
    return text;
  }

  if (length <= 0) {
    return '';
  }

  let truncated = text.slice(0, length);

  if (wordBoundary) {
    const lastSpaceIndex = truncated.lastIndexOf(' ');
    if (lastSpaceIndex > 0) {
      truncated = truncated.slice(0, lastSpaceIndex);
    }
  }

  return truncated + suffix;
};

export const capitalizeWords = (text: string): string => {
  if (!text) return '';
  
  return text.replace(/\b\w/g, char => char.toUpperCase());
};

export const formatNumber = (
  num: number,
  decimals?: number,
  locale: string = 'en-US'
): string => {
  if (typeof num !== 'number' || isNaN(num)) {
    return '0';
  }

  const options: Intl.NumberFormatOptions = {
    useGrouping: true,
  };

  if (decimals !== undefined) {
    options.minimumFractionDigits = decimals;
    options.maximumFractionDigits = decimals;
  }

  return new Intl.NumberFormat(locale, options).format(num);
};