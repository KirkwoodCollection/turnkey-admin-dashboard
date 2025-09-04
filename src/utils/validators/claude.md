# Validators Utilities

## Purpose
Input validation and type checking utilities for forms, API responses, and user data.

## Validation Categories

### Form Validators
```typescript
// Email validation
export const validateEmail = (email: string): ValidationResult => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return {
    isValid: emailRegex.test(email),
    message: emailRegex.test(email) ? null : 'Invalid email format'
  };
};

// Date range validation
export const validateDateRange = (startDate: Date, endDate: Date): ValidationResult => {
  const isValid = startDate <= endDate && startDate <= new Date();
  return {
    isValid,
    message: isValid ? null : 'Invalid date range'
  };
};
```

### API Response Validators
```typescript
// Validate API response structure
export const validateApiResponse = <T>(response: unknown, schema: Schema<T>): T => {
  if (!isValidApiResponse(response, schema)) {
    throw new ValidationError('Invalid API response structure');
  }
  return response as T;
};

// WebSocket message validation
export const validateWebSocketMessage = (message: unknown): WebSocketMessage => {
  if (!isValidWebSocketMessage(message)) {
    throw new ValidationError('Invalid WebSocket message format');
  }
  return message as WebSocketMessage;
};
```

### Business Rule Validators
```typescript
// Revenue threshold validation
export const validatePriceThreshold = (price: number, minThreshold: number): ValidationResult => {
  const isValid = price >= minThreshold;
  return {
    isValid,
    message: isValid ? null : `Price must be at least $${minThreshold}`
  };
};

// Session timeout validation
export const validateSessionTimeout = (lastActivity: Date): boolean => {
  const timeoutMinutes = 30;
  const timeDiff = Date.now() - lastActivity.getTime();
  return timeDiff < timeoutMinutes * 60 * 1000;
};
```

## Type Guards
```typescript
// Type guard functions
export const isUser = (obj: unknown): obj is User => {
  return typeof obj === 'object' && obj !== null && 'id' in obj && 'email' in obj;
};

export const isMetricsData = (obj: unknown): obj is MetricsData => {
  return typeof obj === 'object' && obj !== null && 'revenue' in obj && 'sessions' in obj;
};
```

## Implementation Standards
- Clear error messages for failed validations
- Type-safe validation functions
- Composable validation rules
- Performance optimized
- Comprehensive test coverage