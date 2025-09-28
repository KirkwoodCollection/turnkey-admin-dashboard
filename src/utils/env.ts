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
  return getEnvVar('VITE_WEBSOCKET_URL', 'ws://localhost:8002/ws');
};

export const getApiBaseUrl = (): string => {
  return getEnvVar('VITE_API_BASE_URL', 'https://api.turnkeyhms.com/v1');
};

// Admin API URL with fallback to Events service
export const getAdminApiUrl = (): string => {
  const adminApiUrl = getEnvVar('VITE_ADMIN_API_URL', '');
  if (adminApiUrl) {
    return adminApiUrl;
  }

  // Fallback to Events service for admin endpoints
  const isDev = process.env.NODE_ENV === 'development';
  return isDev ? 'http://localhost:8080' : 'https://api.turnkeyhms.com';
};

// Analytics API URL with fallback
export const getAnalyticsApiUrl = (): string => {
  const analyticsApiUrl = getEnvVar('VITE_ANALYTICS_API_URL', '');
  if (analyticsApiUrl) {
    return analyticsApiUrl;
  }

  // Use Analytics service port mapping
  const isDev = process.env.NODE_ENV === 'development';
  return isDev ? 'http://localhost:8001' : 'https://api.turnkeyhms.com';
};

// Feature flags
export const getFeatureFlag = (flagName: string, defaultValue: boolean = false): boolean => {
  const flagValue = getEnvVar(`VITE_FEATURE_${flagName.toUpperCase()}`, defaultValue.toString());
  return flagValue.toLowerCase() === 'true';
};

// Centralized configuration flag
export const useCentralizedConfig = (): boolean => {
  return getFeatureFlag('USE_CENTRALIZED_CONFIG', false);
};

// Admin API service availability check
export const useAdminApiService = (): boolean => {
  return getFeatureFlag('USE_ADMIN_API_SERVICE', false);
};

// WebSocket service availability check
export const useWebSocketService = (): boolean => {
  return getFeatureFlag('USE_WEBSOCKET_SERVICE', false);
};

// WebSocket service health check URL
export const getWebSocketHealthUrl = (): string => {
  const isDev = process.env.NODE_ENV === 'development';
  return isDev ? 'http://localhost:8002/health' : 'https://api.turnkeyhms.com/ws/health';
};

// Check WebSocket service availability
export const checkWebSocketServiceHealth = async (): Promise<boolean> => {
  try {
    const healthUrl = getWebSocketHealthUrl();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(healthUrl, {
      method: 'GET',
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    console.warn('WebSocket service health check failed:', error);
    return false;
  }
};

// Admin WebSocket configuration
export const getAdminWebSocketUrl = (): string => {
  const isDev = process.env.NODE_ENV === 'development';
  return isDev ? 'ws://localhost:8002/ws/admin' : 'wss://api.turnkeyhms.com/ws/admin';
};

// Feature flag for using Admin WebSocket
export const useAdminWebSocket = (): boolean => {
  return getFeatureFlag('USE_ADMIN_WS', false);
};

// Emergency fallback flag
export const useEventsWebSocketFallback = (): boolean => {
  return getFeatureFlag('USE_EVENTS_WS_FALLBACK', false);
};