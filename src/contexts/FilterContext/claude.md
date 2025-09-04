# FilterContext Provider

## Purpose
React Context provider for managing global filter state across all dashboard components.

## Context Architecture
Centralized filter state management with persistence and URL synchronization.

## Context Interface
```typescript
interface FilterContextValue {
  timeRange: TimeRange;
  dateRange: DateRange;
  selectedProperties: string[];
  searchQuery: string;
  customFilters: Record<string, any>;
  
  // Actions
  setTimeRange: (range: TimeRange) => void;
  setDateRange: (range: DateRange) => void;
  toggleProperty: (propertyId: string) => void;
  setSearchQuery: (query: string) => void;
  setCustomFilter: (key: string, value: any) => void;
  clearFilters: () => void;
  
  // Computed values
  hasActiveFilters: boolean;
  filterSummary: string;
}
```

## Provider Implementation
```typescript
export const FilterProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Filter state management
  // URL synchronization
  // Local storage persistence
  
  return (
    <FilterContext.Provider value={contextValue}>
      {children}
    </FilterContext.Provider>
  );
};
```

## Usage Pattern
```typescript
// At app root
<FilterProvider>
  <Dashboard />
</FilterProvider>

// In components
const { timeRange, setTimeRange, hasActiveFilters } = useContext(FilterContext);
```

## Features
- URL state synchronization
- Local storage persistence
- Debounced filter updates
- Filter combination logic
- Clear all filters functionality