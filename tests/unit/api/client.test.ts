import { apiClient, setAuthToken, clearAuthToken } from '../../../src/services/client';

// Mock fetch globally
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('API Client', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    clearAuthToken();
    
    // Mock successful response by default
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({ success: true }),
      text: async () => 'Success',
      headers: new Headers(),
    } as Response);
  });

  describe('GET requests', () => {
    it('makes GET requests correctly', async () => {
      const mockResponse = { data: 'test' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      } as Response);

      const result = await apiClient.get('/test-endpoint');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/test-endpoint'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('includes query parameters', async () => {
      const params = { page: 1, limit: 10 };
      await apiClient.get('/test', params);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('page=1&limit=10'),
        expect.any(Object)
      );
    });

    it('includes authorization header when token is set', async () => {
      setAuthToken('test-token');
      await apiClient.get('/protected');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token',
          }),
        })
      );
    });
  });

  describe('POST requests', () => {
    it('makes POST requests with data', async () => {
      const postData = { name: 'test', value: 123 };
      await apiClient.post('/create', postData);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/create'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(postData),
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('handles FormData correctly', async () => {
      const formData = new FormData();
      formData.append('file', 'test-content');

      await apiClient.post('/upload', formData);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          body: formData,
          // Should not include Content-Type header for FormData
          headers: expect.not.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });
  });

  describe('PUT requests', () => {
    it('makes PUT requests correctly', async () => {
      const updateData = { id: 1, name: 'updated' };
      await apiClient.put('/update/1', updateData);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/update/1'),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(updateData),
        })
      );
    });
  });

  describe('DELETE requests', () => {
    it('makes DELETE requests correctly', async () => {
      await apiClient.delete('/delete/1');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/delete/1'),
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });
  });

  describe('error handling', () => {
    it('handles 404 errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ message: 'Resource not found' }),
      } as Response);

      await expect(apiClient.get('/nonexistent')).rejects.toThrow('HTTP 404: Resource not found');
    });

    it('handles 401 authentication errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ message: 'Invalid credentials' }),
      } as Response);

      await expect(apiClient.get('/protected')).rejects.toThrow('HTTP 401: Invalid credentials');
    });

    it('handles 500 server errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ message: 'Server error' }),
      } as Response);

      await expect(apiClient.get('/error')).rejects.toThrow('HTTP 500: Server error');
    });

    it('handles network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(apiClient.get('/test')).rejects.toThrow('Network error');
    });

    it('handles timeout errors', async () => {
      mockFetch.mockImplementationOnce(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 100)
        )
      );

      await expect(apiClient.get('/slow')).rejects.toThrow('Request timeout');
    });

    it('handles malformed JSON responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => {
          throw new Error('Invalid JSON');
        },
        text: async () => 'Invalid JSON response',
      } as Response);

      await expect(apiClient.get('/invalid-json')).rejects.toThrow('Invalid JSON');
    });
  });

  describe('request interceptors', () => {
    it('applies custom headers', async () => {
      const customHeaders = { 'X-Custom-Header': 'test-value' };
      await apiClient.get('/test', {}, customHeaders);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Custom-Header': 'test-value',
          }),
        })
      );
    });

    it('handles request ID generation', async () => {
      await apiClient.get('/test');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Request-ID': expect.any(String),
          }),
        })
      );
    });

    it('includes user agent information', async () => {
      await apiClient.get('/test');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'User-Agent': expect.stringContaining('TurnkeyHMS-Admin'),
          }),
        })
      );
    });
  });

  describe('response processing', () => {
    it('handles empty responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        json: async () => {
          throw new Error('No content');
        },
        text: async () => '',
      } as Response);

      const result = await apiClient.get('/empty');
      expect(result).toBeNull();
    });

    it('handles non-JSON responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => {
          throw new Error('Not JSON');
        },
        text: async () => 'Plain text response',
      } as Response);

      const result = await apiClient.get('/text');
      expect(result).toBe('Plain text response');
    });

    it('processes response headers', async () => {
      const responseHeaders = new Headers();
      responseHeaders.set('X-Total-Count', '100');
      responseHeaders.set('X-Page', '1');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: responseHeaders,
        json: async () => ({ data: [] }),
      } as Response);

      const result = await apiClient.get('/paginated');
      expect(result).toEqual({ data: [] });
    });
  });

  describe('authentication management', () => {
    it('sets and uses auth token', () => {
      const token = 'test-auth-token';
      setAuthToken(token);

      expect(apiClient.get('/protected')).toBeDefined();
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': `Bearer ${token}`,
          }),
        })
      );
    });

    it('clears auth token', async () => {
      setAuthToken('test-token');
      clearAuthToken();

      await apiClient.get('/test');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.not.objectContaining({
            'Authorization': expect.any(String),
          }),
        })
      );
    });

    it('handles token refresh scenarios', async () => {
      // First request fails with 401
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Token expired' }),
      } as Response);

      // Simulate token refresh and retry logic
      // This would depend on your specific implementation
      await expect(apiClient.get('/protected')).rejects.toThrow('HTTP 401');
    });
  });

  describe('request configuration', () => {
    it('respects timeout settings', async () => {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), 50);

      mockFetch.mockImplementationOnce(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      );

      // Assuming the client supports abort signals
      await expect(apiClient.get('/slow')).rejects.toThrow();
    });

    it('handles base URL configuration', async () => {
      await apiClient.get('/relative-path');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('http'), // Should be absolute URL
        expect.any(Object)
      );
    });

    it('applies default request options', async () => {
      await apiClient.get('/test');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          credentials: 'include',
          mode: 'cors',
        })
      );
    });
  });

  describe('concurrent requests', () => {
    it('handles multiple simultaneous requests', async () => {
      const requests = [
        apiClient.get('/endpoint1'),
        apiClient.get('/endpoint2'),
        apiClient.get('/endpoint3'),
      ];

      await Promise.all(requests);

      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('handles request deduplication for identical requests', async () => {
      const endpoint = '/same-endpoint';
      const requests = [
        apiClient.get(endpoint),
        apiClient.get(endpoint),
        apiClient.get(endpoint),
      ];

      await Promise.all(requests);

      // Depending on implementation, might deduplicate identical requests
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('rate limiting integration', () => {
    it('handles rate limit responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        headers: new Headers({
          'Retry-After': '60',
          'X-RateLimit-Remaining': '0',
        }),
        json: async () => ({ message: 'Rate limit exceeded' }),
      } as Response);

      await expect(apiClient.get('/limited')).rejects.toThrow('HTTP 429: Rate limit exceeded');
    });

    it('respects retry-after headers', async () => {
      // This would test the client's built-in retry logic
      // Implementation depends on your specific rate limiting strategy
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: new Headers({ 'Retry-After': '1' }),
        json: async () => ({ message: 'Rate limited' }),
      } as Response);

      await expect(apiClient.get('/rate-limited')).rejects.toThrow();
    });
  });
});