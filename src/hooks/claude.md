# Custom Hooks Library

## Purpose
Reusable React hooks for common dashboard functionality.

## Hook Categories

### Data Hooks
- `useRealtimeData`: WebSocket subscription wrapper
- `useCachedQuery`: React Query wrapper with caching
- `useFilteredData`: Apply time/dimension filters

### UI Hooks
- `useDebounce`: Debounce user input
- `useInfiniteScroll`: Virtual scrolling
- `useResponsive`: Responsive breakpoints

### Business Logic Hooks
- `useSessionAnalytics`: Session aggregation logic
- `useConversionFunnel`: Funnel calculations
- `useRevenueMetrics`: Revenue KPI calculations

## Hook Patterns

### Composition Pattern
```typescript
// Combine multiple hooks for complex logic
const useAnalyticsDashboard = () => {
  const { data: sessions } = useCachedQuery('sessions');
  const metrics = useRevenueMetrics(sessions);
  const funnel = useConversionFunnel(sessions);
  
  return { sessions, metrics, funnel };
};
```

### Error Boundary Integration
```typescript
const useSafeQuery = (key: string) => {
  const [error, setError] = useState(null);
  
  try {
    return useQuery(key);
  } catch (err) {
    setError(err);
    return { error, data: null };
  }
};
```

## Testing Hooks
- Use @testing-library/react-hooks
- Test loading states
- Test error conditions
- Test cleanup functions