import React, { useState, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Switch,
  FormControlLabel,
  Chip,
  Button,
  Alert,
  CircularProgress,
  Avatar,
  LinearProgress,
  ButtonGroup,
  Tooltip,
  IconButton
} from '@mui/material';
import {
  TrendingUp,
  People,
  LocationOn,
  CalendarToday,
  Timer,
  Refresh,
  ThreeDRotation,
  Business,
  Route,
  Bed,
  ShoppingCart,
  Timeline,
  Download,
  Settings,
} from '@mui/icons-material';
import Plot from 'react-plotly.js';

import { useDashboardData, useExportAnalytics } from '../hooks/useAnalyticsData';
import { useRealtimeWebSocket } from '../hooks/useRealtimeWebSocket';
import { useEvents } from '../contexts/EventsContext';
import { SessionRecordsTable } from '../components/SessionRecordsTable';
import { TimeRange } from '../services/analyticsApi';

// Time Filter Constants for sophisticated UI
const TIME_PERIODS = {
  TODAY: 'today' as TimeRange,
  T3D: '7d' as TimeRange,    // Mapped to 7d since we don't have 3d
  T7D: '7d' as TimeRange,
  T30D: '30d' as TimeRange,
  ALL: '30d' as TimeRange    // Mapped to 30d as "all time" approximation
};

const TIME_PERIOD_LABELS = {
  [TIME_PERIODS.TODAY]: 'Today',
  [TIME_PERIODS.T3D]: 'T3D',
  [TIME_PERIODS.T7D]: 'T7D',
  [TIME_PERIODS.T30D]: 'T30D',
  [TIME_PERIODS.ALL]: 'All Time'
};

interface AnalyticsDashboardProps {
  propertyId?: string;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  propertyId,
}) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [is3DMode, setIs3DMode] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const dashboardData = useDashboardData(timeRange, propertyId);
  const { isLoading, isError, error } = dashboardData;
  const { recentEvents } = useEvents();

  const { isConnected: wsConnected, error: wsError } = useRealtimeWebSocket({
    propertyId,
    autoInvalidateQueries: true,
    onMetricsUpdate: () => {
      setLastUpdated(new Date());
    },
  });

  const { exportData } = useExportAnalytics();

  // Utility function to format minutes to MM:SS
  const formatMinutesToMMSS = (minutes: number): string => {
    const mins = Math.floor(minutes);
    const secs = Math.floor((minutes - mins) * 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // ONLY REAL API DATA - NO FALLBACKS WHATSOEVER
  const liveStats = useMemo(() => ({
    activeUsers: dashboardData.topMetrics.data?.activeUsers,
    totalSearches: dashboardData.topMetrics.data?.totalSearches,
    searchesLastHour: dashboardData.realtimeMetrics.data?.events_last_hour,
    leadTime: dashboardData.topMetrics.data?.leadTime,
    conversionRate: dashboardData.topMetrics.data?.bookRate,
    abandonmentRate: dashboardData.topMetrics.data?.bookRate ? (100 - dashboardData.topMetrics.data.bookRate) : undefined,
    avgSearchDuration: dashboardData.topMetrics.data?.avgSearchDuration
  }), [dashboardData]);

  // ONLY REAL API DATA - NO EMPTY ARRAY FALLBACKS
  const topDestinations = dashboardData.topDestinations.data;
  const topHotels = dashboardData.topHotels.data;
  const funnelData = dashboardData.funnelData.data;
  const sessionsData = dashboardData?.sessions?.data;

  // Heatmap data from real Analytics API - NO MOCK DATA
  const heatmapData = dashboardData?.heatmapData?.data;

  // Generate real Plotly.js data from API response
  const realHeatmapData = useMemo(() => {
    if (!heatmapData) {
      return {
        '2d': [],
        '3d': []
      };
    }

    // Transform real API data into Plotly format
    const plotlyData = {
      '2d': [{
        type: 'heatmap' as const,
        x: heatmapData.xAxis,
        y: heatmapData.yAxis,
        z: heatmapData.zData,
        colorscale: [[0, '#FFF3E0'], [0.5, '#FF9800'], [1, '#E65100']] as any,
        showscale: true,
        hoverongaps: false
      }],
      '3d': [{
        type: 'scatter3d' as const,
        mode: 'markers' as const,
        x: heatmapData.scatter3d?.x,
        y: heatmapData.scatter3d?.y,
        z: heatmapData.scatter3d?.z,
        marker: {
          size: heatmapData.scatter3d?.sizes,
          color: heatmapData.scatter3d?.colors,
          opacity: 0.8
        }
      }]
    };

    return plotlyData;
  }, [heatmapData]);

  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period);
    // Map sophisticated UI periods to TimeRange
    const timeRangeMap: Record<string, TimeRange> = {
      'today': 'today',
      't3d': '7d',
      't7d': '7d',
      't30d': '30d',
      'all': '30d'
    };
    setTimeRange(timeRangeMap[period] || '24h');
  };

  const handleRefreshAll = () => {
    setLastUpdated(new Date());
  };

  const handleExport = async () => {
    try {
      await exportData(timeRange, 'csv', propertyId);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header Section with sophisticated styling */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
          Real-Time Analytics Dashboard
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </Typography>

          <Chip
            label={wsConnected ? "🟢 Real-time Connected" : "🔴 Offline"}
            size="small"
            color={wsConnected ? "success" : "error"}
            variant="outlined"
          />

          <Tooltip title="Refresh all data">
            <IconButton onClick={handleRefreshAll} color="primary" size="small">
              <Refresh />
            </IconButton>
          </Tooltip>

          <Tooltip title="Export data">
            <IconButton onClick={handleExport} color="primary" size="small">
              <Download />
            </IconButton>
          </Tooltip>

          <Tooltip title="Settings">
            <IconButton color="primary" size="small">
              <Settings />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Time Filter Buttons */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        {isLoading && (
          <CircularProgress size={16} sx={{ mr: 1 }} />
        )}
        <ButtonGroup size="small" variant="outlined">
          {Object.values(TIME_PERIODS).map((period) => (
            <Button
              key={period}
              onClick={() => handlePeriodChange(period)}
              variant={selectedPeriod === period ? 'contained' : 'outlined'}
              disabled={isLoading}
              sx={{
                minWidth: period === TIME_PERIODS.ALL ? '70px' : '45px',
                fontSize: '0.75rem',
                fontWeight: selectedPeriod === period ? 'bold' : 'normal',
                ...(selectedPeriod === period && {
                  bgcolor: 'primary.main',
                  color: 'white',
                  '&:hover': {
                    bgcolor: 'primary.dark'
                  }
                })
              }}
            >
              {TIME_PERIOD_LABELS[period]}
            </Button>
          ))}
        </ButtonGroup>
      </Box>

      {/* Error Alerts */}
      {wsError && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          WebSocket connection error: Real-time updates may be delayed
        </Alert>
      )}

      {isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to load analytics data: {error?.message}
        </Alert>
      )}

      {/* Top Statistics Panel - 6 sophisticated widgets */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Active Users */}
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <People color="primary" />
                {isLoading ? (
                  <CircularProgress size={20} />
                ) : (
                  <Typography variant="h6">
                    {typeof liveStats.activeUsers === 'number' ? liveStats.activeUsers : '-'}
                  </Typography>
                )}
              </Box>
              <Typography variant="body2" color="text.secondary">
                Active Users
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Total Searches */}
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TrendingUp color="success" />
                {isLoading ? (
                  <CircularProgress size={20} />
                ) : (
                  <Typography variant="h6">
                    {typeof liveStats.totalSearches === 'number' ? liveStats.totalSearches : '-'}
                  </Typography>
                )}
              </Box>
              <Typography variant="body2" color="text.secondary">
                Total Searches
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Searches Last Hour */}
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Timer color="info" />
                {isLoading ? (
                  <CircularProgress size={20} />
                ) : (
                  <Typography variant="h6">
                    {typeof liveStats.searchesLastHour === 'number' ? liveStats.searchesLastHour : '-'}
                  </Typography>
                )}
              </Box>
              <Typography variant="body2" color="text.secondary">
                Searches Last Hour
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Lead Time */}
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CalendarToday color="warning" />
                {isLoading ? (
                  <CircularProgress size={20} />
                ) : (
                  <Typography variant="h6">
                    {typeof liveStats.leadTime === 'number' ? `${liveStats.leadTime} days` : '-'}
                  </Typography>
                )}
              </Box>
              <Typography variant="body2" color="text.secondary">
                Lead Time
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Look to Book Rate */}
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Bed color="success" />
                  <Typography variant="body2" fontWeight="bold">
                    {typeof liveStats.conversionRate === 'number' ? `${liveStats.conversionRate.toFixed(1)}%` : '-'}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <ShoppingCart color="error" />
                  <Typography variant="body2" fontWeight="bold">
                    {typeof liveStats.abandonmentRate === 'number' ? `${liveStats.abandonmentRate.toFixed(1)}%` : '-'}
                  </Typography>
                </Box>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Look to Book Rate
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Avg Search Duration */}
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Timer color="secondary" />
                {isLoading ? (
                  <CircularProgress size={20} />
                ) : (
                  <Typography variant="h6">
                    {typeof liveStats.avgSearchDuration === 'number' ? formatMinutesToMMSS(liveStats.avgSearchDuration) : '-'}
                  </Typography>
                )}
              </Box>
              <Typography variant="body2" color="text.secondary">
                Avg Search Duration
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Three Column Layout */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Top Destinations */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: 400 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <LocationOn color="primary" />
              <Typography variant="h6">Top Destinations</Typography>
            </Box>
            {isLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : topDestinations?.length ? (
              topDestinations.map((dest: any, index: number) => (
                <Box key={dest.destination} sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  py: 2,
                  borderBottom: index < topDestinations.length - 1 ? 1 : 0,
                  borderColor: 'divider'
                }}>
                  <Box>
                    <Typography variant="body1" fontWeight="medium">
                      #{index + 1} {dest.destination}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {Math.round((dest.count / topDestinations.reduce((s: any, d: any) => s + d.count, 0)) * 100)}% of searches
                    </Typography>
                  </Box>
                  <Typography variant="h6" color="primary">{dest.count}</Typography>
                </Box>
              ))
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                No destination data available
              </Typography>
            )}
          </Paper>
        </Grid>

        {/* Top Hotels */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: 400 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Business color="secondary" />
              <Typography variant="h6">Top Hotels</Typography>
            </Box>
            {isLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : topHotels?.length ? (
              <Box sx={{ maxHeight: 320, overflow: 'auto' }}>
                {topHotels.map((hotel, index) => (
                  <Box key={hotel.name} sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    py: 2,
                    borderBottom: index < topHotels.length - 1 ? 1 : 0,
                    borderColor: 'divider'
                  }}>
                    <Box>
                      <Typography variant="body1" fontWeight="medium">
                        #{index + 1} {hotel.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {hotel.destination} • {Math.round((hotel.bookings / topHotels.reduce((s, h) => s + h.bookings, 0)) * 100)}% of bookings
                      </Typography>
                    </Box>
                    <Typography variant="h6" color="secondary">{hotel.bookings}</Typography>
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                No hotel data available
              </Typography>
            )}
          </Paper>
        </Grid>

        {/* Funnel Stats */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: 400 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Route color="info" />
              <Typography variant="h6">Booking Funnel</Typography>
            </Box>
            {isLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : funnelData?.length ? (
              <Box sx={{ maxHeight: 320, overflow: 'auto' }}>
                {funnelData.map((stage) => (
                  <Box key={stage.stage} sx={{ mb: 2.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                      <Typography variant="body2" fontWeight="medium">{stage.stage}</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" color="text.secondary">{stage.percentage.toFixed(1)}%</Typography>
                        <Typography variant="body1" fontWeight="bold">{stage.count.toLocaleString()}</Typography>
                      </Box>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={stage.percentage}
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: '#f5f5f5',
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: stage.color,
                          borderRadius: 4
                        }
                      }}
                    />
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                No funnel data available
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Interactive Heatmap Visualization */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5">
            Interactive Heatmap
            <Typography variant="body2" color="text.secondary" component="span" sx={{ ml: 2 }}>
              Booking activity by destination and lead time
            </Typography>
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={is3DMode}
                  onChange={(e) => setIs3DMode(e.target.checked)}
                  icon={<ThreeDRotation />}
                  checkedIcon={<ThreeDRotation color="primary" />}
                />
              }
              label={is3DMode ? "3D Mode" : "2D Mode"}
              sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.875rem' } }}
            />
          </Box>
        </Box>

        <Plot
          data={is3DMode ? realHeatmapData['3d'] : realHeatmapData['2d']}
          layout={is3DMode ? {
            title: {
              text: 'Animated Heatmap: 🧡 Prospect (Orange) • 💚 Booked (Green) • Duration = Size • Recency = Opacity'
            },
            scene: {
              xaxis: {
                title: { text: 'Days from Arrival (Today = 0, Future = 160)' },
                range: [0, 160]
              },
              yaxis: {
                title: { text: 'Trailing 7 Days of Activity' },
                range: [0, 6]
              },
              zaxis: {
                title: { text: 'Destinations' },
                tickvals: [0, 1, 2, 3, 4],
                ticktext: ['Palm Springs', 'San Luis Obispo', 'Santa Barbara', 'Monterey', 'Napa']
              }
            },
            height: 500,
            margin: { t: 80, b: 60, l: 60, r: 50 }
          } : {
            title: {
              text: 'Heatmap: Booking Activity by Destination and Lead Time'
            },
            xaxis: {
              title: { text: 'Days Until Arrival' },
              range: [0, 160]
            },
            yaxis: {
              title: { text: 'Destinations' }
            },
            height: 400,
            margin: { l: 150, t: 100, b: 80, r: 100 }
          }}
          config={{
            displayModeBar: true,
            displaylogo: false,
            modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d']
          }}
          style={{ width: '100%' }}
        />
      </Paper>

      {/* Session Records & Recent Activity */}
      <Grid container spacing={3}>
        <Grid item xs={12} lg={8}>
          <SessionRecordsTable
            useRealtime={true}
            propertyId={propertyId}
            title="Live Session Records"
            onSessionClick={(session) => console.log('Session clicked:', session)}
          />
        </Grid>

        <Grid item xs={12} lg={4}>
          <Paper sx={{ p: 3, height: 400 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Timeline color="primary" />
              <Typography variant="h6">Recent Activity</Typography>
            </Box>
            <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
              {recentEvents?.length ? (
                recentEvents.map((event, index) => (
                  <Box key={event.id} sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    py: 1.5,
                    borderBottom: index < recentEvents.length - 1 ? 1 : 0,
                    borderColor: 'divider'
                  }}>
                    <Avatar sx={{ width: 24, height: 24, bgcolor: 'primary.main', fontSize: '0.75rem' }}>
                      {index + 1}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Chip
                          label={event.type.replace('_', ' ')}
                          size="small"
                          color="primary"
                        />
                        <Typography variant="body2" color="text.secondary">
                          {new Date(event.timestamp).toLocaleTimeString()}
                        </Typography>
                      </Box>
                      <Typography variant="body2">
                        {event.data?.destination && `Destination: ${event.data.destination}`}
                        {event.data?.hotel && `Hotel: ${event.data.hotel}`}
                        {!event.data?.destination && !event.data?.hotel && 'Activity recorded'}
                      </Typography>
                    </Box>
                  </Box>
                ))
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                  No recent activity data available
                </Typography>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AnalyticsDashboard;