import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../src/contexts/AuthContext';
import { TimeFilterProvider } from '../../src/contexts/TimeFilterContext';
import { WebSocketProvider } from '../../src/contexts/WebSocketContext';

// Create test theme
const testTheme = createTheme({
  palette: {
    mode: 'light',
  },
});

// Custom render function with all providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={testTheme}>
        <BrowserRouter>
          <AuthProvider>
            <WebSocketProvider url="ws://localhost:3003">
              <TimeFilterProvider>
                {children}
              </TimeFilterProvider>
            </WebSocketProvider>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options });

// Create mock user for authentication tests
export const mockUser = {
  uid: 'test-user-123',
  email: 'test@turnkeyhms.com',
  displayName: 'Test User',
  role: 'admin' as const,
};

// Create a test query client
export const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      gcTime: 0,
      staleTime: 0,
    },
    mutations: {
      retry: false,
    },
  },
});

// Utility to wait for async operations
export const waitForElement = (callback: () => void) => {
  return new Promise<void>((resolve) => {
    setTimeout(() => {
      callback();
      resolve();
    }, 0);
  });
};

// Mock intersection observer entry
export const createMockIntersectionObserverEntry = (isIntersecting: boolean) => ({
  isIntersecting,
  target: document.createElement('div'),
  boundingClientRect: {} as DOMRectReadOnly,
  intersectionRatio: isIntersecting ? 1 : 0,
  intersectionRect: {} as DOMRectReadOnly,
  rootBounds: {} as DOMRectReadOnly,
  time: Date.now(),
});

export * from '@testing-library/react';
export { customRender as render };