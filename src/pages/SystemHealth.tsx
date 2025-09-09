import React, { useState, useCallback } from 'react';
import {
  Box,
  Stack,
  Typography,
  Grid,
  Card,
  CardContent,
  Alert,
  Fab,
  Fade,
  IconButton,
  Tooltip,
  Switch,
  FormControlLabel,
  Paper,
  Divider,
  Chip,
} from '@mui/material';
import {
  RefreshRounded,
  SettingsRounded,
  NotificationsRounded,
  FullscreenRounded,
  FullscreenExitRounded,
  AutorenewRounded,
} from '@mui/icons-material';
import { useSystemHealth } from '../hooks/useSystemHealth';
import { ServiceHealthGrid } from '../components/health/ServiceHealthGrid';
import { DependencyGraph } from '../components/health/DependencyGraph';
import { HealthMetricsChart } from '../components/health/HealthMetricsChart';
import { IntegrationTestRunner } from '../components/health/IntegrationTestRunner';
import { HEALTH_STATUS_COLORS, HEALTH_STATUS_LABELS } from '../types';

export const SystemHealthDashboard: React.FC = () => {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [fullscreenChart, setFullscreenChart] = useState(false);
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h' | '7d'>('1h');

  const {
    systemHealth,
    healthHistory,
    dependencies,
    integrationTests,
    systemMetrics,
    dashboardState,
    overallHealthStatus,
    criticalServices,
    degradedServices,
    uptimePercentage,
    healthySvervicesCount,
    totalServicesCount,
    isLoading,
    error,
    refetchHealth,
    runIntegrationTests,
    isRunningTests,
    lastWebSocketUpdate,
    isConnected,
  } = useSystemHealth({
    refetchInterval: autoRefresh ? 30000 : false,
    historyHours: timeRange === '1h' ? 1 : timeRange === '6h' ? 6 : timeRange === '24h' ? 24 : 168,
  });

  const handleServiceClick = useCallback((serviceId: string) => {
    console.log('Service clicked:', serviceId);
    // TODO: Navigate to service details or show modal
  }, []);

  const handleRefreshAll = useCallback(() => {
    refetchHealth();
  }, [refetchHealth]);

  const formatLastUpdate = (timestamp: string | null) => {
    if (!timestamp) return 'Never';
    const diff = Date.now() - new Date(timestamp).getTime();
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} minutes ago`;
    return new Date(timestamp).toLocaleTimeString();
  };

  const getOverallStatusColor = () => {
    return HEALTH_STATUS_COLORS[overallHealthStatus];
  };

  return (
    <Box sx={{ height: '100%', overflow: 'auto' }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
              System Health Dashboard
            </Typography>
            <Stack direction="row" alignItems="center" spacing={2}>
              <Chip
                label={`${HEALTH_STATUS_LABELS[overallHealthStatus]} System`}
                sx={{
                  bgcolor: `${getOverallStatusColor()}15`,
                  color: getOverallStatusColor(),
                  fontWeight: 600,
                  fontSize: '0.875rem',
                }}
              />
              <Typography variant="body2" color="text.secondary">
                Last updated: {formatLastUpdate(lastWebSocketUpdate)}
              </Typography>
              {!isConnected && (
                <Chip 
                  label="WebSocket Disconnected" 
                  color="error" 
                  size="small"
                  variant="outlined"
                />
              )}
            </Stack>
          </Box>

          <Stack direction="row" alignItems="center" spacing={1}>
            <FormControlLabel
              control={
                <Switch
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  icon={<AutorenewRounded />}
                  checkedIcon={<AutorenewRounded />}
                />
              }
              label="Auto Refresh"
            />

            <Tooltip title="Refresh all data">
              <IconButton onClick={handleRefreshAll} disabled={isLoading}>
                <RefreshRounded />
              </IconButton>
            </Tooltip>

            <Tooltip title="Settings">
              <IconButton>
                <SettingsRounded />
              </IconButton>
            </Tooltip>

            <Tooltip title="Notifications">
              <IconButton>
                <NotificationsRounded />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>

        {/* System Overview Cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h3" sx={{ 
                  fontWeight: 600, 
                  color: getOverallStatusColor(),
                  mb: 1 
                }}>
                  {healthySvervicesCount}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Healthy Services
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  of {totalServicesCount} total
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h3" sx={{ 
                  fontWeight: 600, 
                  color: criticalServices.length > 0 ? 'error.main' : 'success.main',
                  mb: 1 
                }}>
                  {criticalServices.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Critical Issues
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  unhealthy services
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h3" sx={{ 
                  fontWeight: 600, 
                  color: degradedServices.length > 0 ? 'warning.main' : 'success.main',
                  mb: 1 
                }}>
                  {degradedServices.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Warnings
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  degraded services
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h3" sx={{ 
                  fontWeight: 600, 
                  color: uptimePercentage >= 99 ? 'success.main' : 'warning.main',
                  mb: 1 
                }}>
                  {uptimePercentage.toFixed(1)}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  System Uptime
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  last {timeRange}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 3 }}
          action={
            <IconButton size="small" onClick={handleRefreshAll}>
              <RefreshRounded />
            </IconButton>
          }
        >
          System health data could not be loaded: {error}
        </Alert>
      )}

      {/* Main Content */}
      <Grid container spacing={3}>
        {/* Services Grid */}
        <Grid item xs={12} lg={8}>
          <ServiceHealthGrid
            services={systemHealth?.services || []}
            isLoading={isLoading}
            error={error}
            onServiceClick={handleServiceClick}
            onRefresh={handleRefreshAll}
          />
        </Grid>

        {/* Integration Tests */}
        <Grid item xs={12} lg={4}>
          <IntegrationTestRunner
            testSuite={integrationTests}
            isRunning={isRunningTests}
            onRunTests={runIntegrationTests}
            disabled={isLoading}
          />
        </Grid>

        {/* Health Metrics Chart */}
        <Grid item xs={12}>
          <Paper sx={{ position: 'relative' }}>
            <HealthMetricsChart
              healthHistory={healthHistory}
              systemMetrics={systemMetrics}
              isLoading={isLoading}
              error={error}
              onTimeRangeChange={setTimeRange}
              currentTimeRange={timeRange}
            />
            
            <Tooltip title={fullscreenChart ? "Exit fullscreen" : "Fullscreen chart"}>
              <IconButton
                sx={{ position: 'absolute', top: 16, right: 16 }}
                onClick={() => setFullscreenChart(!fullscreenChart)}
              >
                {fullscreenChart ? <FullscreenExitRounded /> : <FullscreenRounded />}
              </IconButton>
            </Tooltip>
          </Paper>
        </Grid>

        {/* Dependency Graph */}
        <Grid item xs={12}>
          <DependencyGraph
            dependencies={dependencies}
            services={systemHealth?.services || []}
            onServiceClick={handleServiceClick}
            height={500}
          />
        </Grid>
      </Grid>

      {/* Floating Action Button for Quick Actions */}
      <Fade in={!isLoading}>
        <Fab
          color="primary"
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 1000,
          }}
          onClick={handleRefreshAll}
        >
          <RefreshRounded />
        </Fab>
      </Fade>

      {/* Fullscreen Chart Modal */}
      {fullscreenChart && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: 'background.default',
            zIndex: 1300,
            p: 3,
          }}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              Health Metrics - Full View
            </Typography>
            <IconButton onClick={() => setFullscreenChart(false)}>
              <FullscreenExitRounded />
            </IconButton>
          </Stack>
          
          <Box sx={{ height: 'calc(100vh - 120px)' }}>
            <HealthMetricsChart
              healthHistory={healthHistory}
              systemMetrics={systemMetrics}
              isLoading={isLoading}
              error={error}
              onTimeRangeChange={setTimeRange}
              currentTimeRange={timeRange}
            />
          </Box>
        </Box>
      )}
    </Box>
  );
};