# Source Code Organization

## Directory Structure Philosophy
The src/ directory follows a feature-first organization with shared infrastructure. Each directory has a specific responsibility and clear boundaries.

## Import Rules
1. Features can import from shared components
2. Features cannot import from other features
3. Services are singleton instances
4. Contexts wrap the entire application
5. Hooks encapsulate reusable logic

## State Management Strategy
- Local state for UI-only concerns
- React Query for server state
- Context for cross-cutting concerns (auth, theme, filters)
- WebSocket state managed centrally

## Performance Considerations
- Lazy load feature modules
- Memoize expensive computations
- Use virtual scrolling for large lists
- Debounce WebSocket message processing

## Code Quality Standards
- 100% TypeScript coverage
- No any types without justification
- Props interfaces for all components
- JSDoc comments for public APIs