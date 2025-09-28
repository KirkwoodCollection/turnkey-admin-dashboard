import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthGuard } from './components/AuthGuard';
import { Layout } from './components/Layout';
import { WebSocketProvider } from './contexts/WebSocketContext';
import { TimeFilterProvider } from './contexts/TimeFilterContext';
import { AuthProvider } from './contexts/AuthContext';
import { HealthProvider } from './contexts/HealthContext';
import { EventsProvider } from './contexts/EventsContext';
import { Overview } from './pages/Overview';
import { SystemHealthDashboard } from './pages/SystemHealth';
import { AnalyticsDashboard } from './pages/AnalyticsDashboard';

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // 30 seconds
      gcTime: 5 * 60 * 1000, // 5 minutes
      retry: 3,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    },
  },
});

// Create Material-UI theme
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
    },
    secondary: {
      main: '#dc004e',
      light: '#ff5983',
      dark: '#9a0036',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
    grey: {
      50: '#fafafa',
      100: '#f5f5f5',
      200: '#eeeeee',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h6: {
      fontWeight: 600,
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
        },
      },
    },
  },
});

function App() {
  return (
    <ErrorBoundary onError={(error, errorInfo) => {
      // In production, send to error tracking service
      console.error('Application error:', error, errorInfo);
    }}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <BrowserRouter>
            <AuthProvider>
              <AuthGuard>
                <WebSocketProvider>
                  <HealthProvider>
                    <EventsProvider>
                      <TimeFilterProvider>
                        <Routes>
                          <Route path="/" element={
                            <Layout currentPage="analytics">
                              <AnalyticsDashboard />
                            </Layout>
                          } />
                          <Route path="/overview" element={
                            <Layout currentPage="overview">
                              <Overview />
                            </Layout>
                          } />
                          <Route path="/system-health" element={
                            <Layout currentPage="system-health">
                              <SystemHealthDashboard />
                            </Layout>
                          } />
                          <Route path="/analytics" element={
                            <Layout currentPage="analytics">
                              <AnalyticsDashboard />
                            </Layout>
                          } />
                          <Route path="/login" element={<div>Login handled by AuthGuard</div>} />
                          <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                      </TimeFilterProvider>
                    </EventsProvider>
                  </HealthProvider>
                </WebSocketProvider>
              </AuthGuard>
            </AuthProvider>
          </BrowserRouter>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;