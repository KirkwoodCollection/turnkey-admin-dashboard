import '@testing-library/jest-dom';

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

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock scrollIntoView
Element.prototype.scrollIntoView = jest.fn();

// Mock WebSocket
(global as any).WebSocket = jest.fn().mockImplementation(() => ({
  close: jest.fn(),
  send: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  readyState: 0, // CONNECTING
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
}));

// Set static properties
(global.WebSocket as any).CONNECTING = 0;
(global.WebSocket as any).OPEN = 1;
(global.WebSocket as any).CLOSING = 2;
(global.WebSocket as any).CLOSED = 3;

// Mock localStorage
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

// Mock window.location
delete (window as any).location;
(window as any).location = {
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
  assign: jest.fn(),
};

// Mock console methods in test environment
console.warn = jest.fn();
console.error = jest.fn();

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