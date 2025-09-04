# Testing Strategy

## Test Categories
1. **Unit Tests**: Components, hooks, utilities
2. **Integration Tests**: Service interactions
3. **E2E Tests**: Critical user journeys
4. **Performance Tests**: Rendering benchmarks

## Testing Stack
- Jest for unit testing
- React Testing Library for components
- MSW for API mocking
- Playwright for E2E tests

## Coverage Requirements
- Minimum 80% code coverage
- 100% coverage for business logic
- Critical paths must have E2E tests

## Test Patterns

### Component Testing
```typescript
describe('FunnelChart', () => {
  it('renders all stages', () => {});
  it('calculates conversion rates', () => {});
  it('handles empty data gracefully', () => {});
  it('responds to interactions', () => {});
});
```

### WebSocket Testing
```typescript
// Mock WebSocket connections
const mockWS = new MockWebSocket();
mockWS.on('message', handler);
mockWS.emit('session.started', mockData);
```

## Performance Testing
- First contentful paint < 1s
- Time to interactive < 3s
- Bundle size < 200KB (gzipped)

## CI/CD Integration
- Run tests on every PR
- Block merge on test failure
- Nightly E2E test runs
- Performance regression detection