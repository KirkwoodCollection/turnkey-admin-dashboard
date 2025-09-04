# Feature Modules Architecture

## Purpose
Self-contained business domain modules following microservices principles.

## Module Organization
Each feature module contains:
- Domain-specific components
- Custom hooks for business logic
- Service layer integration
- Type definitions
- Local state management

## Feature Independence
- No cross-feature imports
- Shared dependencies via services layer
- Independent testing and deployment
- Clear API boundaries

## Module Structure Template
```
feature-name/
├── components/          # Feature-specific UI
├── hooks/              # Business logic hooks  
├── services/           # API integration
├── types/              # Feature type definitions
└── claude.md           # Feature documentation
```

## Integration Points
- Shared components from `/components/shared/`
- Global services via dependency injection
- Context providers for cross-cutting concerns
- Event-driven communication between features

## Development Guidelines
1. **Domain Isolation**: Keep business logic within feature boundaries
2. **Service Integration**: Use services layer for external communication
3. **State Locality**: Manage state close to where it's used
4. **Error Boundaries**: Wrap features in error boundaries
5. **Lazy Loading**: Load features on-demand for performance