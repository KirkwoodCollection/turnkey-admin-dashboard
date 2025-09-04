# Component Architecture Guidelines

## Organization Principles
Components are organized by domain rather than generic types (buttons, inputs). This enables feature teams to work independently while maintaining code reusability.

## Component Categories

### Analytics Components (`/analytics/`)
Data visualization components for booking analytics
- Charts, graphs, and metrics displays
- Pure presentation layer only
- Data transformation via hooks

### Real-time Components (`/realtime/`)
Live data streaming components
- WebSocket-powered displays
- Auto-updating interfaces
- Performance optimized for high-frequency updates

### Layout Components (`/layout/`)
Dashboard shell and navigation
- App structure and routing
- Navigation and sidebar components
- Time filters and global controls

### Shared Components (`/shared/`)
Truly reusable components across all domains
- Generic UI components
- Data tables, loading states
- Error boundaries

## Development Standards

### Component Structure
```typescript
interface ComponentProps {
  // Well-defined TypeScript interfaces
}

const Component: React.FC<ComponentProps> = ({ ...props }) => {
  // Component implementation
};

export default React.memo(Component);
```

### Performance Requirements
- Use React.memo for expensive components
- Implement proper useMemo/useCallback
- Virtual scrolling for large lists
- Lazy loading for non-critical components

### Error Handling
- Wrap with error boundaries
- Graceful degradation patterns
- User-friendly error messages
- Retry mechanisms for recoverable errors