# TurnkeyHMS Admin Dashboard - Architecture Guidelines

## Overview
This is the admin dashboard microservice for the TurnkeyHMS platform, providing real-time analytics and revenue management capabilities for hotel operators. This service follows a modular, microservices-aligned architecture with clear separation of concerns.

## Core Principles
1. **Real-time First**: All data updates via WebSocket connections for live monitoring
2. **Cache-First Strategy**: Minimize API calls through intelligent caching
3. **Domain Isolation**: Each feature module is self-contained with its own state management
4. **Service Boundary Respect**: This dashboard never directly writes to databases
5. **Event-Driven Updates**: Subscribe to events rather than polling

## Architecture Decisions
- React 18+ with TypeScript for type safety
- WebSocket connections for real-time data streaming
- React Query for cache management and server state
- Module federation ready for future micro-frontend architecture
- Firebase Auth for authentication (delegated to auth service)

## Integration Points
- **Backend API**: RESTful endpoints at `api.turnkeyhms.com/v1/analytics`
- **WebSocket Gateway**: Real-time events at `wss://api.turnkeyhms.com/ws`
- **Auth Service**: Firebase Auth integration
- **Event Stream**: Subscribe to booking engine events

## Quality Attributes
- **Performance**: Sub-100ms UI updates for real-time events
- **Reliability**: Graceful degradation if WebSocket fails
- **Scalability**: Support 100+ concurrent admin users
- **Maintainability**: Modular structure for independent feature development

## Development Guidelines
- Always check for existing components before creating new ones
- Implement error boundaries for all feature modules
- Use TypeScript strict mode
- Follow the data flow: UI → Hook → Service → API
- Never bypass the service layer for external communication

## Current Implementation Status
- [ ] Core dashboard shell
- [ ] WebSocket infrastructure
- [ ] Analytics components
- [ ] Real-time monitoring
- [ ] AI insights integration