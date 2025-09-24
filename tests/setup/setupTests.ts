import '@testing-library/jest-dom';
import './jest-setup';  // Import the JS setup file to ensure jsdom is initialized

// Mock Service Worker setup is optional for unit tests
// If using MSW, uncomment and import { server } from '../mocks/server';
// beforeAll(() => {
//   server.listen({
//     onUnhandledRequest: 'error',
//   });
// });

// afterEach(() => {
//   server.resetHandlers();
// });

// afterAll(() => {
//   server.close();
// });

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.VITE_API_BASE_URL = 'http://localhost:3002';
process.env.VITE_WS_URL = 'ws://localhost:3003';

// Mock import.meta for Vite
(global as any).importMeta = {
  env: {
    VITE_WS_URL: 'ws://localhost:3003',
    VITE_API_BASE_URL: 'http://localhost:3002'
  }
};

// Mock WebSocket - using class-based implementation for better compatibility
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  CONNECTING = 0;
  OPEN = 1;
  CLOSING = 2;
  CLOSED = 3;
  readyState = MockWebSocket.CONNECTING;

  close = jest.fn();
  send = jest.fn();
  addEventListener = jest.fn();
  removeEventListener = jest.fn();

  constructor(url: string) {
    // Store URL for debugging purposes
    this.url = url;
    this.readyState = MockWebSocket.CONNECTING;
    // Simulate connection opening
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
    }, 0);
  }

  url: string;
}

(global as any).WebSocket = MockWebSocket;

// Mock localStorage and sessionStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
} as unknown as Storage;

(global as any).localStorage = localStorageMock;
(global as any).sessionStorage = localStorageMock;

// Safe window.location mock (window should exist from jest-setup.js)
Object.defineProperty(window, 'location', {
  writable: true,
  value: {
    href: 'http://localhost:3000',
    origin: 'http://localhost:3000',
    protocol: 'http:',
    host: 'localhost:3000',
    hostname: 'localhost',
    port: '3000',
    pathname: '/',
    search: '',
    hash: '',
    reload: jest.fn(),
    replace: jest.fn(),
    assign: jest.fn()
  }
});

// Mock console methods in test environment
const originalWarn = console.warn;
const originalError = console.error;
console.warn = jest.fn();
console.error = jest.fn();

// Restore console methods after all tests (cleanup)
afterAll(() => {
  console.warn = originalWarn;
  console.error = originalError;
});

// Mock plotly.js
jest.mock('plotly.js', () => ({
  newPlot: jest.fn(),
  redraw: jest.fn(),
  relayout: jest.fn(),
  restyle: jest.fn(),
}));

// Disable animations in tests
jest.mock('@mui/material/styles', () => ({
  ...jest.requireActual('@mui/material/styles'),
  useTheme: () => ({
    transitions: {
      create: () => 'none',
    },
    breakpoints: {
      up: () => '@media (min-width:0px)',
      down: () => '@media (max-width:0px)',
    },
  }),
}));