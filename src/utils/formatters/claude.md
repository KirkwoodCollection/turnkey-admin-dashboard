# Formatters Utilities

## Purpose
Display formatting utilities for consistent data presentation across the dashboard.

## Formatting Categories

### Currency Formatters
```typescript
// Currency formatting with locale support
export const formatCurrency = (amount: number, currency = 'USD', locale = 'en-US'): string => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

// Revenue formatting with K/M abbreviations
export const formatRevenue = (amount: number): string => {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(1)}K`;
  }
  return formatCurrency(amount);
};
```

### Date/Time Formatters
```typescript
// Relative time formatting
export const formatRelativeTime = (date: Date): string => {
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const diffInSeconds = (date.getTime() - Date.now()) / 1000;
  
  if (Math.abs(diffInSeconds) < 60) return rtf.format(Math.round(diffInSeconds), 'second');
  if (Math.abs(diffInSeconds) < 3600) return rtf.format(Math.round(diffInSeconds / 60), 'minute');
  if (Math.abs(diffInSeconds) < 86400) return rtf.format(Math.round(diffInSeconds / 3600), 'hour');
  return rtf.format(Math.round(diffInSeconds / 86400), 'day');
};

// Dashboard-specific date formatting
export const formatDashboardDate = (date: Date, format: 'short' | 'medium' | 'long' = 'medium'): string => {
  const options: Intl.DateTimeFormatOptions = {
    short: { month: 'short', day: 'numeric' },
    medium: { month: 'short', day: 'numeric', year: 'numeric' },
    long: { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }
  };
  
  return date.toLocaleDateString('en-US', options[format]);
};
```

### Number Formatters
```typescript
// Percentage formatting
export const formatPercentage = (value: number, decimals = 1): string => {
  return `${(value * 100).toFixed(decimals)}%`;
};

// Large number formatting with abbreviations
export const formatNumber = (num: number): string => {
  if (num >= 1000000000) return `${(num / 1000000000).toFixed(1)}B`;
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString();
};

// Duration formatting (seconds to human readable)
export const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${remainingSeconds}s`;
  return `${remainingSeconds}s`;
};
```

### Status Formatters
```typescript
// Session status formatting
export const formatSessionStatus = (status: SessionStatus): { text: string; color: string } => {
  const statusConfig = {
    active: { text: 'Active', color: 'green' },
    idle: { text: 'Idle', color: 'yellow' },
    abandoned: { text: 'Abandoned', color: 'red' },
    converted: { text: 'Converted', color: 'blue' }
  };
  
  return statusConfig[status] || { text: 'Unknown', color: 'gray' };
};
```

## Implementation Standards
- Consistent formatting across all components
- Internationalization support
- Performance optimized for frequent use
- Memoization for expensive formatting operations
- Accessibility-friendly formats