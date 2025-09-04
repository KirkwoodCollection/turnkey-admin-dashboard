# useCacheFirst Hook

## Purpose
Custom React hook implementing cache-first data fetching strategy with React Query integration.

## Implementation
Prioritizes cached data for immediate UI updates while fetching fresh data in the background.

## Hook Interface
```typescript
interface UseCacheFirstOptions {
  key: string;
  fetcher: () => Promise<any>;
  ttl?: number;
  staleTime?: number;
  cacheTime?: number;
}

interface UseCacheFirstReturn<T> {
  data: T | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isStale: boolean;
  refetch: () => void;
}
```

## Usage Pattern
```typescript
const MyComponent = () => {
  const { data, isLoading, isStale } = useCacheFirst({
    key: 'analytics-data',
    fetcher: () => analyticsApi.getData(),
    ttl: 5 * 60 * 1000, // 5 minutes
  });
  
  return (
    <div>
      {isStale && <StaleDataWarning />}
      {data && <DataDisplay data={data} />}
    </div>
  );
};
```

## Features
- Immediate cache response
- Background data refresh
- Stale data indicators
- TTL-based cache invalidation
- Error boundary integration