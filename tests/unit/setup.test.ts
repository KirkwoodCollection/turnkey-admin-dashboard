// Simple test to verify Jest setup and configuration
describe('Test Setup Verification', () => {
  it('should have Jest configured correctly', () => {
    expect(1 + 1).toBe(2);
  });

  it('should have jsdom environment available', () => {
    expect(document).toBeDefined();
    expect(window).toBeDefined();
  });

  it('should have mocked globals available', () => {
    expect(global.localStorage).toBeDefined();
    expect(global.sessionStorage).toBeDefined();
    expect(global.WebSocket).toBeDefined();
    expect(global.ResizeObserver).toBeDefined();
    expect(global.IntersectionObserver).toBeDefined();
  });

  it('should have environment variables set', () => {
    expect(process.env.VITE_API_BASE_URL).toBe('http://localhost:3002');
    expect(process.env.VITE_WS_URL).toBe('ws://localhost:3003');
  });

  it('should mock localStorage methods', () => {
    expect(typeof global.localStorage.getItem).toBe('function');
    expect(typeof global.localStorage.setItem).toBe('function');
    expect(typeof global.localStorage.removeItem).toBe('function');
    expect(typeof global.localStorage.clear).toBe('function');
  });

  it('should mock WebSocket correctly', () => {
    const ws = new WebSocket('ws://test');
    expect(ws).toBeDefined();
    expect(typeof ws.send).toBe('function');
    expect(typeof ws.close).toBe('function');
    expect(ws.readyState).toBe(0); // CONNECTING
  });

  it('should have testing-library/jest-dom matchers available', () => {
    const element = document.createElement('div');
    element.textContent = 'Hello World';
    document.body.appendChild(element);
    
    expect(element).toBeInTheDocument();
    expect(element).toHaveTextContent('Hello World');
    
    document.body.removeChild(element);
  });

  it('should mock window.location', () => {
    expect(window.location).toBeDefined();
    expect(window.location.href).toBe('http://localhost:3000');
    expect(typeof window.location.reload).toBe('function');
  });

  it('should mock console methods', () => {
    expect(jest.isMockFunction(console.warn)).toBe(true);
    expect(jest.isMockFunction(console.error)).toBe(true);
  });
});