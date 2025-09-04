# Cache Service Layer

## Purpose
Intelligent caching layer using React Query and IndexedDB for offline support.

## Cache Architecture
- React Query for server state management
- IndexedDB for persistent storage
- Memory cache for hot data
- Cache warming on startup

## Cache Policies

### Stale-While-Revalidate
Default policy for most data:
- Return cached data immediately
- Fetch fresh data in background
- Update UI when fresh data arrives

### Cache-First
For historical data:
- Check cache first
- Only fetch if cache miss
- TTL: 1 hour

### Network-First
For critical real-time data:
- Always attempt network
- Fall back to cache on failure
- Warning indicator for stale data

## Implementation
```typescript
interface CacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, data: T, ttl?: number): Promise<void>;
  invalidate(pattern: string): Promise<void>;
  clear(): Promise<void>;
  warm(keys: string[]): Promise<void>;
}
```

### Cache Keys Structure
- `sessions:[timeRange]:[filters]`
- `metrics:[type]:[timeRange]`
- `funnel:[timeRange]:[segment]`
- `heatmap:[dateRange]:[property]`

### Performance Targets
- Cache hit ratio > 80%
- Cache retrieval < 10ms
- Background refresh < 100ms