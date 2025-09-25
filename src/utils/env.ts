// Environment utilities for handling Vite and test environments

export const getEnvVar = (key: keyof ImportMetaEnv, defaultValue: string = ''): string => {
  // In test environment, use process.env
  if (process.env.NODE_ENV === 'test') {
    return process.env[key] || defaultValue;
  }

  // In browser/Vite environment, use import.meta.env
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env[key] || defaultValue;
  }

  // Fallback for production builds
  return defaultValue;
};

export const getWebSocketUrl = (): string => {
  return getEnvVar('VITE_WEBSOCKET_URL', 'ws://localhost:8000/api/v1/admin/ws');
};

export const getApiBaseUrl = (): string => {
  return getEnvVar('VITE_API_BASE_URL', 'https://api.turnkeyhms.com/v1');
};