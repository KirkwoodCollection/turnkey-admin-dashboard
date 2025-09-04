# TypeScript Type Definitions

## Purpose
Centralized type definitions for the entire application.

## Type Organization
- Domain-specific type files
- Shared interface definitions
- API response types
- Event type definitions

## Type Categories

### Domain Types
```typescript
// Session analytics types
interface UserSession {
  id: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  events: SessionEvent[];
}

// Revenue management types
interface RevenueMetrics {
  revPAR: number;
  adr: number;
  occupancy: number;
  period: DateRange;
}
```

### API Types
- Request/response interfaces
- Error response types
- Pagination types
- Filter parameter types

### Event Types
- WebSocket event definitions
- User interaction events
- System event types
- Analytics event schemas

## Type Standards
- Strict TypeScript configuration
- No `any` types allowed
- Comprehensive interface documentation
- Generic type utilities where appropriate