import React, { useState } from 'react';
import {
  Box,
  Container,
  Grid,
  Typography,
  FormControl,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  Paper,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Refresh,
  Settings,
  Download,
  TrendingUp,
  Dashboard as DashboardIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';

import { MetricsRow } from '../components/analytics/MetricsRow';
import { TopDestinations } from '../components/analytics/TopDestinations';
import { TopHotels } from '../components/analytics/TopHotels';
import { FunnelChart } from '../components/analytics/FunnelChart';
import { UserJourneyHeatmap } from '../components/analytics/UserJourneyHeatmap';
import { SessionRecordsTable } from '../components/SessionRecordsTable';
import { LiveActivityFeed } from '../components/LiveActivityFeed';

import { useDashboardData, useExportAnalytics } from '../hooks/useAnalyticsData';
import { useAnalyticsWebSocket } from '../hooks/useAnalyticsWebSocket';
import { TimeRange } from '../services/analyticsApi';

interface AnalyticsDashboardProps {
  propertyId?: string;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  propertyId,
}) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [showRealtime, setShowRealtime] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const {
    topMetrics,
    funnelData,
    topDestinations,
    topHotels,
    realtimeMetrics,
    isLoading,
    isError,
    error,
  } = useDashboardData(timeRange, propertyId);

  const { isConnected: wsConnected, error: wsError } = useAnalyticsWebSocket({
    propertyId,
    autoInvalidateQueries: true,
    onMetricsUpdate: () => {
      setLastRefresh(new Date());
    },
  });

  const { exportData } = useExportAnalytics();

  const handleTimeRangeChange = (newTimeRange: TimeRange) => {
    setTimeRange(newTimeRange);
    setLastRefresh(new Date());
  };

  const handleRefreshAll = () => {
    setLastRefresh(new Date());
  };

  const handleExport = async () => {
    try {
      await exportData(timeRange, 'csv', propertyId);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleDestinationClick = (destination: string) => {
    console.log('Destination clicked:', destination);
  };

  const handleHotelClick = (hotelName: string) => {
    console.log('Hotel clicked:', hotelName);
  };

  const handleFunnelStageClick = (stage: string) => {
    console.log('Funnel stage clicked:', stage);
  };

  const getTimeRangeLabel = (range: TimeRange): string => {
    switch (range) {
      case '1h': return 'Last Hour';
      case '24h': return 'Last 24 Hours';
      case '7d': return 'Last 7 Days';
      case '30d': return 'Last 30 Days';
      case 'today': return 'Today';
      default: return range;
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <DashboardIcon color="primary" sx={{ fontSize: 32 }} />
            <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
              Real-Time Analytics Dashboard
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={showRealtime}
                  onChange={(e) => setShowRealtime(e.target.checked)}
                  color="primary"
                />
              }
              label="Real-time"
              sx={{ mr: 2 }}
            />

            <FormControl size="small" sx={{ minWidth: 150 }}>
              <Select
                value={timeRange}
                onChange={(e) => handleTimeRangeChange(e.target.value as TimeRange)}
                displayEmpty
              >
                <MenuItem value="1h">Last Hour</MenuItem>
                <MenuItem value="24h">Last 24 Hours</MenuItem>
                <MenuItem value="7d">Last 7 Days</MenuItem>
                <MenuItem value="30d">Last 30 Days</MenuItem>
                <MenuItem value="today">Today</MenuItem>
              </Select>
            </FormControl>

            <Tooltip title="Refresh all data">
              <IconButton onClick={handleRefreshAll} color="primary">
                <Refresh />
              </IconButton>
            </Tooltip>

            <Tooltip title="Export data">
              <IconButton onClick={handleExport} color="primary">
                <Download />
              </IconButton>
            </Tooltip>

            <Tooltip title="Settings">
              <IconButton color="primary">
                <Settings />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Chip
            icon={<TrendingUp />}
            label={`${getTimeRangeLabel(timeRange)}`}
            color="primary"
            variant="outlined"
          />

          {showRealtime && (
            <Chip
              label={wsConnected ? 'Live Connected' : 'Offline'}
              color={wsConnected ? 'success' : 'error'}
              size="small"
              variant="outlined"
            />
          )}

          <Chip
            label={`Updated ${format(lastRefresh, 'HH:mm:ss')}`}
            size="small"
            variant="outlined"
          />

          {propertyId && (
            <Chip
              label={`Property: ${propertyId}`}
              size="small"
              color="secondary"
              variant="outlined"
            />
          )}
        </Box>
      </Box>

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

      <MetricsRow
        timeRange={timeRange}
        propertyId={propertyId}
        onRefresh={handleRefreshAll}
      />

      <Grid container spacing={3}>
        <Grid item xs={12} lg={8}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TopDestinations
                timeRange={timeRange}
                propertyId={propertyId}
                onDestinationClick={handleDestinationClick}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TopHotels
                timeRange={timeRange}
                propertyId={propertyId}
                onHotelClick={handleHotelClick}
              />
            </Grid>

            <Grid item xs={12}>
              <UserJourneyHeatmap
                timeRange={timeRange}
                propertyId={propertyId}
              />
            </Grid>

            <Grid item xs={12}>
              <SessionRecordsTable
                title="Session Records"
                useAnalytics={true}
                timeRange={timeRange}
                propertyId={propertyId}
                useRealtime={showRealtime}
              />
            </Grid>
          </Grid>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FunnelChart
                timeRange={timeRange}
                propertyId={propertyId}
                onStageClick={handleFunnelStageClick}
              />
            </Grid>

            {showRealtime && (
              <Grid item xs={12}>
                <LiveActivityFeed
                  propertyId={propertyId}
                  maxItems={30}
                  showMetrics={true}
                  autoScroll={true}
                />
              </Grid>
            )}
          </Grid>
        </Grid>
      </Grid>

      <Paper sx={{ mt: 4, p: 2, backgroundColor: 'background.default' }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
          Dashboard automatically refreshes every minute •
          Real-time updates via WebSocket •
          Export available in CSV/JSON formats •
          Time range: {getTimeRangeLabel(timeRange)}
        </Typography>
      </Paper>
    </Container>
  );
};