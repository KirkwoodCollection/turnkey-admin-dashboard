# TurnkeyHMS Admin Dashboard

Real-time analytics dashboard microservice for the TurnkeyHMS platform. Provides comprehensive analytics and monitoring capabilities for hotel revenue managers with real-time WebSocket updates.

## Features

- 📊 **Real-time Analytics**: Live dashboard updates via WebSocket connections
- 🔥 **Live Session Monitoring**: Track active user sessions and behaviors
- 📈 **Conversion Funnel**: Visual funnel analysis with stage-by-stage metrics
- 🗺️ **Activity Heatmap**: User activity patterns across dates and time periods
- 🏆 **Top Destinations & Hotels**: Performance rankings and metrics
- 📋 **Session Records**: Detailed session tracking with search and filtering
- 🎨 **Modern UI**: Material-UI components with responsive design
- 🔒 **Secure Authentication**: Mock authentication with proper error handling
- ⚡ **Performance Optimized**: Bundle splitting and lazy loading
- 🐳 **Docker Ready**: Production-ready containerization

## Architecture

This dashboard follows a microservices-aligned architecture with:
- React 18+ with TypeScript for type safety
- WebSocket connections for real-time data streaming
- React Query for cache management and server state
- Material-UI for consistent design
- Modular component structure for maintainability

See `claude.md` for detailed architecture guidelines.

## Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### Development Setup

1. **Clone and install dependencies:**
```bash
git clone <repository>
cd turnkey-admin-dashboard
npm install
```

2. **Environment configuration:**
```bash
cp .env.example .env.local
# Edit .env.local with your API endpoints
```

3. **Start development server:**
```bash
npm run dev
```

The dashboard will be available at `http://localhost:3001`

### Docker Development

```bash
# Development with hot reload
docker-compose --profile dev up admin-dashboard-dev

# Production build
docker-compose up admin-dashboard
```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run type-check` - Run TypeScript checks
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | Backend API URL | `https://api.turnkeyhms.com` |
| `VITE_WS_URL` | WebSocket URL | `wss://api.turnkeyhms.com/ws` |
| `VITE_DEV_MODE` | Enable dev features | `true` |

## Authentication

For development, use the demo credentials:
- **Email**: `admin@turnkeyhms.com`
- **Password**: `password`

## Component Structure

```
src/
├── components/          # Reusable UI components
│   ├── TopStatsPanel/   # Statistics cards
│   ├── FunnelChart/     # Conversion funnel visualization
│   ├── HeatmapCalendar/ # Activity heatmap
│   └── ...
├── contexts/           # React contexts
├── hooks/             # Custom hooks
├── pages/             # Route pages
├── api/              # API services
├── types/            # TypeScript definitions
└── utils/            # Utility functions
```

## Performance

- **Bundle Size**: <500KB gzipped
- **Load Time**: <2 seconds
- **Real-time Updates**: <100ms latency
- **Memory Usage**: Optimized for long-running sessions

## Security

- Input sanitization and XSS prevention
- Content Security Policy headers
- Secure authentication flow
- Rate limiting for API requests
- No sensitive data in localStorage

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Development Status

- ✅ **Core Infrastructure**: TypeScript, Vite, ESLint setup
- ✅ **API Integration**: RESTful endpoints with error handling
- ✅ **WebSocket Connection**: Auto-reconnection and message handling
- ✅ **Authentication**: Mock auth with proper flow
- ✅ **Dashboard Layout**: Responsive design with Material-UI
- ✅ **Statistics Cards**: 6 key metrics matching design
- ✅ **Funnel Visualization**: Interactive conversion funnel
- ✅ **Activity Heatmap**: Date/time activity matrix
- ✅ **Session Tracking**: Real-time session monitoring
- ✅ **Performance Optimization**: Code splitting and caching
- ✅ **Docker Configuration**: Production-ready containerization

## Contributing

1. Follow TypeScript strict mode
2. Use existing component patterns
3. Add proper error boundaries
4. Include loading states for async operations
5. Maintain <80% bundle size increase

## License

Private - TurnkeyHMS Platform
