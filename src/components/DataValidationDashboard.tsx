import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Box,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Alert,
  AlertTitle,
  CircularProgress,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
} from '@mui/material';
import {
  ExpandMore,
  Refresh,
  Assessment,
  Warning,
  CheckCircle,
  Error as ErrorIcon,
  Storage,
  Analytics,
  Timeline,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { eventsApi } from '../services/eventsApi';
import { analyticsApi } from '../services/analyticsApi';
import { useActiveSessions } from '../hooks/useEventsApi';
import { useAnalyticsSessions } from '../hooks/useAnalyticsData';
import { format } from 'date-fns';

interface ValidationStats {
  totalSessions: number;
  totalEvents: number;
  totalUsers: number;
  activeSessions: number;
  displayedSessions: number;
  lastUpdated: string;
}

interface DataSourceComparison {
  source: string;
  sessions: number;
  status: 'success' | 'warning' | 'error';
  lastCheck: string;
}

export const DataValidationDashboard: React.FC = () => {
  const [refreshKey, setRefreshKey] = useState(0);

  // Get displayed sessions from current dashboard
  const { data: activeSessions = [], isLoading: activeLoading } = useActiveSessions();
  const { data: analyticsData, isLoading: analyticsLoading } = useAnalyticsSessions('24h', 100, 0);

  // Get validation data from Events service
  const { data: eventsValidation, isLoading: eventsValidationLoading, refetch: refetchEventsValidation } = useQuery({
    queryKey: ['events-validation', refreshKey],
    queryFn: async () => {
      try {
        // Use the new validation API methods
        const [sessionsCount, eventsCount, validationSummary] = await Promise.all([
          eventsApi.getTotalSessionsCount(),
          eventsApi.getTotalEventsCount(),
          eventsApi.getValidationSummary(),
        ]);

        return {
          totalSessions: sessionsCount.total,
          totalEvents: eventsCount.total,
          sessionsByStatus: sessionsCount.byStatus,
          eventsByType: eventsCount.byType,
          dataQuality: validationSummary.dataQuality,
          displayedInAPI: activeSessions.length,
          lastUpdated: new Date().toISOString(),
        };
      } catch (error) {
        console.error('Events validation error:', error);

        // Fallback to basic session count
        try {
          const allSessions = await eventsApi.getSessions({ pageSize: 1000 });
          return {
            totalSessions: allSessions.total || allSessions.sessions.length,
            totalEvents: 0,
            sessionsByStatus: {},
            eventsByType: {},
            dataQuality: {
              sessionsWithNullDestination: 0,
              sessionsWithNullHotel: 0,
              eventsWithoutSession: 0,
            },
            displayedInAPI: allSessions.sessions.length,
            lastUpdated: new Date().toISOString(),
          };
        } catch (fallbackError) {
          console.error('Fallback validation also failed:', fallbackError);
          throw fallbackError;
        }
      }
    },
    staleTime: 30 * 1000, // 30 seconds
  });

  // Get validation data from Analytics service
  const { data: analyticsValidation, isLoading: analyticsValidationLoading, refetch: refetchAnalyticsValidation } = useQuery({
    queryKey: ['analytics-validation', refreshKey],
    queryFn: async () => {
      try {
        // Get overview metrics that might include totals
        const overview = await analyticsApi.getOverviewMetrics();

        // Try to get analytics-specific counts
        let totalAnalyticsSessions = 0;
        try {
          const analyticsResponse = await fetch(`${import.meta.env.VITE_ANALYTICS_API_URL}/admin/sessions/count`);
          if (analyticsResponse.ok) {
            const data = await analyticsResponse.json();
            totalAnalyticsSessions = data.count || 0;
          }
        } catch (error) {
          console.warn('Analytics count endpoint not available:', error);
        }

        return {
          overview,
          totalAnalyticsSessions,
          displayedInAnalytics: analyticsData?.sessions?.length || 0,
          lastUpdated: new Date().toISOString(),
        };
      } catch (error) {
        console.error('Analytics validation error:', error);
        throw error;
      }
    },
    staleTime: 30 * 1000,
  });

  const handleRefreshAll = () => {
    setRefreshKey(prev => prev + 1);
    refetchEventsValidation();
    refetchAnalyticsValidation();
  };

  const getValidationStatus = (displayed: number, total: number): 'success' | 'warning' | 'error' => {
    if (total === 0) return 'warning';
    if (displayed === total) return 'success';
    if (displayed > total * 0.8) return 'warning'; // 80% threshold
    return 'error';
  };

  const formatPercentage = (displayed: number, total: number): string => {
    if (total === 0) return '0%';
    return `${Math.round((displayed / total) * 100)}%`;
  };

  const dataSources: DataSourceComparison[] = [
    {
      source: 'Events API (Real-time)',
      sessions: activeSessions.length,
      status: getValidationStatus(activeSessions.length, eventsValidation?.totalSessions || 0),
      lastCheck: format(new Date(), 'HH:mm:ss'),
    },
    {
      source: 'Analytics API (24h)',
      sessions: analyticsData?.sessions?.length || 0,
      status: getValidationStatus(analyticsData?.sessions?.length || 0, analyticsValidation?.totalAnalyticsSessions || 0),
      lastCheck: format(new Date(), 'HH:mm:ss'),
    },
  ];

  const isLoading = eventsValidationLoading || analyticsValidationLoading || activeLoading || analyticsLoading;

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Storage />
          Data Validation Dashboard
        </Typography>
        <Button
          variant="outlined"
          startIcon={isLoading ? <CircularProgress size={20} /> : <Refresh />}
          onClick={handleRefreshAll}
          disabled={isLoading}
        >
          Refresh All
        </Button>
      </Box>

      {/* Overview Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card sx={{ bgcolor: 'primary.50' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Assessment color="primary" />
                <Typography variant="h6">Total Sessions</Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 600 }}>
                {eventsValidation?.totalSessions?.toLocaleString() || '-'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                In Events database
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card sx={{ bgcolor: 'info.50' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Timeline color="info" />
                <Typography variant="h6">Total Events</Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 600 }}>
                {eventsValidation?.totalEvents?.toLocaleString() || '-'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                In Events database
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card sx={{ bgcolor: 'success.50' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Analytics color="success" />
                <Typography variant="h6">Displayed</Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 600 }}>
                {activeSessions.length.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Currently in dashboard
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card sx={{ bgcolor: 'warning.50' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Assessment color="warning" />
                <Typography variant="h6">Coverage</Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 600 }}>
                {formatPercentage(activeSessions.length, eventsValidation?.totalSessions || 0)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Of total sessions
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Data Source Comparison */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Assessment />
            Data Source Comparison
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Data Source</TableCell>
                  <TableCell align="right">Sessions Displayed</TableCell>
                  <TableCell align="center">Status</TableCell>
                  <TableCell>Last Check</TableCell>
                  <TableCell>Coverage</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {dataSources.map((source) => (
                  <TableRow key={source.source}>
                    <TableCell>{source.source}</TableCell>
                    <TableCell align="right">
                      <Typography sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                        {source.sessions.toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        icon={
                          source.status === 'success' ? <CheckCircle /> :
                          source.status === 'warning' ? <Warning /> : <ErrorIcon />
                        }
                        label={source.status.toUpperCase()}
                        color={source.status}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {source.lastCheck}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {formatPercentage(source.sessions, eventsValidation?.totalSessions || 0)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Validation Alerts */}
      {eventsValidation && activeSessions.length < (eventsValidation.totalSessions * 0.5) && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <AlertTitle>Low Data Coverage Detected</AlertTitle>
          Dashboard is only showing {formatPercentage(activeSessions.length, eventsValidation.totalSessions)} of total sessions.
          This may indicate filtering issues or schema changes affecting data retrieval.
        </Alert>
      )}

      {eventsValidation?.totalEvents === 0 && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <AlertTitle>No Events Found</AlertTitle>
          The Events service reports 0 total events. This may indicate a data pipeline issue or
          the count endpoint is not yet implemented.
        </Alert>
      )}

      {eventsValidation?.dataQuality && (
        eventsValidation.dataQuality.sessionsWithNullDestination > 0 ||
        eventsValidation.dataQuality.sessionsWithNullHotel > 0
      ) && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <AlertTitle>Data Quality Issues Detected</AlertTitle>
          Found {eventsValidation.dataQuality.sessionsWithNullDestination} sessions without destination and{' '}
          {eventsValidation.dataQuality.sessionsWithNullHotel} sessions without hotel information.
          This suggests schema changes or data processing issues.
        </Alert>
      )}

      {/* Detailed Breakdowns */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography sx={{ fontWeight: 600 }}>Events Service Details</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                  Session Statistics
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography>Total in Database:</Typography>
                  <Typography sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                    {eventsValidation?.totalSessions?.toLocaleString() || '-'}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography>Displayed in Dashboard:</Typography>
                  <Typography sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                    {activeSessions.length.toLocaleString()}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography>Coverage:</Typography>
                  <Typography sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                    {formatPercentage(activeSessions.length, eventsValidation?.totalSessions || 0)}
                  </Typography>
                </Box>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                  Event Statistics
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography>Total Events:</Typography>
                  <Typography sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                    {eventsValidation?.totalEvents?.toLocaleString() || 'Not Available'}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography>Last Updated:</Typography>
                  <Typography sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                    {eventsValidation?.lastUpdated ? format(new Date(eventsValidation.lastUpdated), 'HH:mm:ss') : '-'}
                  </Typography>
                </Box>
              </Paper>
            </Grid>
          </Grid>

          {/* Session Status Breakdown */}
          {eventsValidation?.sessionsByStatus && Object.keys(eventsValidation.sessionsByStatus).length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                Sessions by Status
              </Typography>
              <Grid container spacing={2}>
                {Object.entries(eventsValidation.sessionsByStatus).map(([status, count]) => (
                  <Grid item xs={6} md={3} key={status}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="h6" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                        {count.toLocaleString()}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ textTransform: 'uppercase' }}>
                        {status.replace('_', ' ')}
                      </Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

          {/* Event Type Breakdown */}
          {eventsValidation?.eventsByType && Object.keys(eventsValidation.eventsByType).length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                Events by Type
              </Typography>
              <Grid container spacing={2}>
                {Object.entries(eventsValidation.eventsByType)
                  .sort(([,a], [,b]) => b - a) // Sort by count descending
                  .slice(0, 8) // Show top 8 event types
                  .map(([eventType, count]) => (
                  <Grid item xs={6} md={3} key={eventType}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="h6" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                        {count.toLocaleString()}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ textTransform: 'uppercase' }}>
                        {eventType.replace('_', ' ')}
                      </Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

          {/* Data Quality Issues */}
          {eventsValidation?.dataQuality && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                Data Quality Metrics
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: eventsValidation.dataQuality.sessionsWithNullDestination > 0 ? 'warning.50' : 'success.50' }}>
                    <Typography variant="h6" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                      {eventsValidation.dataQuality.sessionsWithNullDestination.toLocaleString()}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Sessions w/o Destination
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: eventsValidation.dataQuality.sessionsWithNullHotel > 0 ? 'warning.50' : 'success.50' }}>
                    <Typography variant="h6" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                      {eventsValidation.dataQuality.sessionsWithNullHotel.toLocaleString()}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Sessions w/o Hotel
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: eventsValidation.dataQuality.eventsWithoutSession > 0 ? 'warning.50' : 'success.50' }}>
                    <Typography variant="h6" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                      {eventsValidation.dataQuality.eventsWithoutSession.toLocaleString()}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Orphaned Events
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </Box>
          )}
        </AccordionDetails>
      </Accordion>

      <Accordion>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography sx={{ fontWeight: 600 }}>Analytics Service Details</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                  Analytics Sessions
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography>Analytics Total:</Typography>
                  <Typography sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                    {analyticsValidation?.totalAnalyticsSessions?.toLocaleString() || 'Not Available'}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography>Displayed (24h):</Typography>
                  <Typography sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                    {analyticsData?.sessions?.length?.toLocaleString() || 0}
                  </Typography>
                </Box>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                  Overview Metrics
                </Typography>
                <Divider sx={{ mb: 2 }} />
                {analyticsValidation?.overview ? (
                  Object.entries(analyticsValidation.overview).map(([key, value]) => (
                    <Box key={key} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography sx={{ textTransform: 'capitalize' }}>
                        {key.replace(/([A-Z])/g, ' $1')}:
                      </Typography>
                      <Typography sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                        {typeof value === 'number' ? value.toLocaleString() : String(value)}
                      </Typography>
                    </Box>
                  ))
                ) : (
                  <Typography color="text.secondary">No overview data available</Typography>
                )}
              </Paper>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};