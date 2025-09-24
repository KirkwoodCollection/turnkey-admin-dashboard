import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { ApiError } from '../types';

// Service URLs from environment
const ANALYTICS_SERVICE_URL = (import.meta as any).env.VITE_ANALYTICS_SERVICE_URL || 'http://localhost:8001/api/v1';
const EVENTS_SERVICE_URL = (import.meta as any).env.VITE_EVENTS_SERVICE_URL || 'http://localhost:8000/api/v1';
const API_BASE_URL = (import.meta as any).env.VITE_API_BASE_URL || 'https://api.turnkeyhms.com';

class ApiClient {
  private analyticsInstance: AxiosInstance;
  private eventsInstance: AxiosInstance;
  private instance: AxiosInstance; // Legacy instance for backward compatibility
  private isRefreshing = false;

  constructor() {
    // Analytics service instance
    this.analyticsInstance = axios.create({
      baseURL: ANALYTICS_SERVICE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': (import.meta as any).env.VITE_ANALYTICS_API_KEY || '',
      },
    });

    // Events service instance
    this.eventsInstance = axios.create({
      baseURL: EVENTS_SERVICE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-API-Key': (import.meta as any).env.VITE_EVENTS_INTERNAL_API_KEY || '',
      },
    });

    // Legacy instance for backward compatibility
    this.instance = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    const instances = [this.analyticsInstance, this.eventsInstance, this.instance];

    instances.forEach(instance => {
      // Request interceptor
      instance.interceptors.request.use(
        (config) => {
          const token = localStorage.getItem('authToken');
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
          return config;
        },
        (error) => Promise.reject(error)
      );

      // Response interceptor with retry logic
      instance.interceptors.response.use(
        (response: AxiosResponse) => response,
        async (error) => {
          const originalRequest = error.config;

          if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            if (!this.isRefreshing) {
              this.isRefreshing = true;
              try {
                await this.refreshToken();
                return instance(originalRequest);
              } catch (refreshError) {
                this.redirectToLogin();
                return Promise.reject(refreshError);
              } finally {
                this.isRefreshing = false;
              }
            }
          }

          // Convert axios errors to our custom ApiError
          if (error.response) {
            throw new ApiError(
              error.response.data?.message || 'API request failed',
              error.response.status,
              error.response.data?.code
            );
          }

          if (error.code === 'NETWORK_ERROR') {
            throw new ApiError('Network error - check your connection', 0, 'NETWORK_ERROR');
          }

          throw new ApiError('Request failed', 0, 'UNKNOWN_ERROR');
        }
      );
    });
  }

  private async refreshToken(): Promise<string> {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }
    
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
        refreshToken,
      });
      
      const { accessToken } = response.data;
      localStorage.setItem('authToken', accessToken);
      return accessToken;
    } catch (error) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      throw error;
    }
  }

  private redirectToLogin() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    window.location.href = '/login';
  }

  // Service-specific methods
  public get analytics() {
    return {
      get: async <T>(url: string, config = {}): Promise<T> => {
        const response = await this.analyticsInstance.get(url, config);
        return response.data;
      },
      post: async <T>(url: string, data?: unknown, config = {}): Promise<T> => {
        const response = await this.analyticsInstance.post(url, data, config);
        return response.data;
      },
      put: async <T>(url: string, data?: unknown, config = {}): Promise<T> => {
        const response = await this.analyticsInstance.put(url, data, config);
        return response.data;
      },
      delete: async <T>(url: string, config = {}): Promise<T> => {
        const response = await this.analyticsInstance.delete(url, config);
        return response.data;
      },
      api: this.analyticsInstance
    };
  }

  public get events() {
    return {
      get: async <T>(url: string, config = {}): Promise<T> => {
        const response = await this.eventsInstance.get(url, config);
        return response.data;
      },
      post: async <T>(url: string, data?: unknown, config = {}): Promise<T> => {
        const response = await this.eventsInstance.post(url, data, config);
        return response.data;
      },
      put: async <T>(url: string, data?: unknown, config = {}): Promise<T> => {
        const response = await this.eventsInstance.put(url, data, config);
        return response.data;
      },
      delete: async <T>(url: string, config = {}): Promise<T> => {
        const response = await this.eventsInstance.delete(url, config);
        return response.data;
      },
      api: this.eventsInstance
    };
  }

  // Legacy public methods (backward compatibility)
  public async get<T>(url: string, config = {}): Promise<T> {
    const response = await this.instance.get(url, config);
    return response.data;
  }

  public async post<T>(url: string, data?: unknown, config = {}): Promise<T> {
    const response = await this.instance.post(url, data, config);
    return response.data;
  }

  public async put<T>(url: string, data?: unknown, config = {}): Promise<T> {
    const response = await this.instance.put(url, data, config);
    return response.data;
  }

  public async delete<T>(url: string, config = {}): Promise<T> {
    const response = await this.instance.delete(url, config);
    return response.data;
  }

  get api(): AxiosInstance {
    return this.instance;
  }
}

export const apiClient = new ApiClient();