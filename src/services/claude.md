# Service Layer Architecture

## Purpose
Business logic abstraction and external system integration layer.

## Service Organization
- `api/`: RESTful endpoint management
- `websocket/`: Real-time connection handling (legacy)
- `auth/`: Authentication and authorization
  - `adminTokenService.ts`: Admin JWT token acquisition from Session service (ADR-002)
- `cache/`: Intelligent caching strategies

## Design Principles
1. **Single Responsibility**: Each service has one clear purpose
2. **Dependency Injection**: Services are injected, not imported directly
3. **Error Boundaries**: Consistent error handling across all services
4. **Observable Patterns**: Services emit events for state changes

## Service Lifecycle
- Services initialize on application startup
- Cleanup resources on application shutdown
- Graceful degradation on service failures
- Health checks for critical services

## Integration Patterns
- Services never directly manipulate UI state
- Communication via hooks and context providers
- Consistent interfaces across all services
- Mock implementations for testing