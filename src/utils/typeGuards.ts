// Type guards and safe utilities for handling API responses

export const isArrayWithData = <T>(value: any): value is T[] => {
  return Array.isArray(value) && value.length > 0;
};

export const safeArray = <T>(value: any): T[] => {
  return Array.isArray(value) ? value : [];
};

export const safeObject = <T extends Record<string, any>>(value: any): T => {
  return (value && typeof value === 'object' && !Array.isArray(value)) ? value : {} as T;
};

export const safeString = (value: any, defaultValue = ''): string => {
  return typeof value === 'string' ? value : defaultValue;
};

export const safeNumber = (value: any, defaultValue = 0): number => {
  const num = Number(value);
  return !isNaN(num) ? num : defaultValue;
};

// Safe data access for analytics components
export const getMetricsValue = (metrics: any, key: string, defaultValue: any = 0) => {
  if (!metrics || typeof metrics !== 'object') return defaultValue;
  return metrics[key] ?? defaultValue;
};