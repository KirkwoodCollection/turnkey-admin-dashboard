// Add TextEncoder/TextDecoder polyfills
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// jsdom environment is already configured in jest.config.cjs
// Just ensure globals are properly set

// Add missing Web APIs that jsdom doesn't provide
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock scrollTo
global.scrollTo = jest.fn();
window.scrollTo = jest.fn();

// Mock Element.prototype.scrollIntoView
Element.prototype.scrollIntoView = jest.fn();

// Add requestAnimationFrame and cancelAnimationFrame
global.requestAnimationFrame = jest.fn((callback) => {
  setTimeout(callback, 0);
});
global.cancelAnimationFrame = jest.fn();

// Mock performance API
global.performance = {
  ...global.performance,
  now: jest.fn(() => Date.now()),
};

console.log('✅ Jest jsdom environment initialized successfully');