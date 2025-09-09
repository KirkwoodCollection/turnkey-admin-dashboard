// Environment utilities for handling Vite and test environments

export const getEnvVar = (key: string, defaultValue: string = ''): string => {
  // In test environment, use process.env
  if (process.env.NODE_ENV === 'test') {
    return process.env[key] || defaultValue;
  }
  
  // In browser/Vite environment, use import.meta.env
  if (typeof window !== 'undefined' && 'import' in window && 'meta' in (window as any).import) {
    const meta = (window as any).import.meta;
    return meta?.env?.[key] || defaultValue;
  }
  
  // Fallback for production builds
  return defaultValue;
};

export const getWebSocketUrl = (): string => {
  return getEnvVar('VITE_WS_URL', 'wss://api.turnkeyhms.com/ws');
};

export const getApiBaseUrl = (): string => {
  return getEnvVar('VITE_API_BASE_URL', 'https://api.turnkeyhms.com/v1');
};