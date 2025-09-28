import React from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Button,
  ButtonGroup,
  Chip,
  Avatar,
  Menu,
  MenuItem,
  CircularProgress,
  Badge,
  Tooltip,
  Stack,
} from '@mui/material';
import {
  RefreshRounded,
  AccountCircle,
  LogoutRounded,
  SettingsRounded,
  FiberManualRecordRounded,
  MonitorHeartRounded,
  NotificationsRounded,
  DashboardRounded,
  AnalyticsRounded,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTimeFilter } from '../contexts/TimeFilterContext';
import { useEvents } from '../contexts/EventsContext';
import { useAuth } from '../hooks/useAuth';
import { useHealthStatus, useHealthAlerts } from '../contexts/HealthContext';
import { HEALTH_STATUS_COLORS, HEALTH_STATUS_LABELS } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  currentPage?: 'overview' | 'system-health' | 'analytics';
}

export const Layout: React.FC<LayoutProps> = ({
  children
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { 
    selectedFilter, 
    setSelectedFilter, 
    availableFilters, 
    isLoading 
  } = useTimeFilter();
  const { isConnected, connectionError, connectionType } = useEvents();
  const { user, logout } = useAuth();
  
  // Health context hooks
  const healthStatus = useHealthStatus();
  const { unreadCount: unreadAlertsCount } = useHealthAlerts();
  
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [alertsMenuAnchor, setAlertsMenuAnchor] = React.useState<null | HTMLElement>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleAlertsMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAlertsMenuAnchor(event.currentTarget);
  };

  const handleAlertsMenuClose = () => {
    setAlertsMenuAnchor(null);
  };

  const handleLogout = () => {
    handleMenuClose();
    logout();
  };

  const handleNavigate = (page: 'overview' | 'system-health') => {
    if (page === 'overview') {
      navigate('/overview');
    } else {
      navigate('/system-health');
    }
  };

  // Determine current page from location
  const actualCurrentPage = location.pathname === '/system-health'
    ? 'system-health'
    : location.pathname.startsWith('/analytics')
    ? 'analytics'
    : 'overview';

  const getConnectionStatus = () => {
    if (isConnected) {
      const statusText = connectionType === 'admin' ? 'Admin WS' : 'Events WS';
      return {
        color: connectionType === 'admin' ? 'success' as const : 'warning' as const,
        text: statusText
      };
    } else {
      return {
        color: 'error' as const,
        text: connectionError ? 'Connection Error' : 'Disconnected'
      };
    }
  };

  const connectionStatus = getConnectionStatus();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="sticky" elevation={1} sx={{ bgcolor: 'white', color: 'text.primary' }}>
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* Navigation Tabs */}
            <Stack direction="row" spacing={1}>
              <Button
                variant={actualCurrentPage === 'overview' ? 'contained' : 'text'}
                startIcon={<DashboardRounded />}
                onClick={() => handleNavigate('overview')}
                size="small"
              >
                Overview
              </Button>
              <Button
                variant={actualCurrentPage === 'analytics' ? 'contained' : 'text'}
                startIcon={<AnalyticsRounded />}
                onClick={() => navigate('/analytics')}
                size="small"
              >
                Analytics
              </Button>
              <Button
                variant={actualCurrentPage === 'system-health' ? 'contained' : 'text'}
                startIcon={<MonitorHeartRounded />}
                onClick={() => handleNavigate('system-health')}
                size="small"
                sx={{
                  '& .MuiButton-startIcon': {
                    color: healthStatus.status !== 'healthy' ? HEALTH_STATUS_COLORS[healthStatus.status] : undefined
                  }
                }}
              >
                System Health
              </Button>
            </Stack>
            
            {isLoading && (
              <CircularProgress size={20} />
            )}
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>

            {/* System Health Status */}
            <Tooltip 
              title={
                <Box>
                  <Typography variant="body2">System Status: {HEALTH_STATUS_LABELS[healthStatus.status]}</Typography>
                  <Typography variant="body2">Healthy Services: {healthStatus.healthyServices}/{healthStatus.totalServices}</Typography>
                  {healthStatus.criticalServicesCount > 0 && (
                    <Typography variant="body2" color="error.main">
                      Critical Issues: {healthStatus.criticalServicesCount}
                    </Typography>
                  )}
                </Box>
              }
            >
              <Chip
                icon={<MonitorHeartRounded sx={{ fontSize: '14px !important' }} />}
                label={HEALTH_STATUS_LABELS[healthStatus.status]}
                sx={{
                  bgcolor: `${HEALTH_STATUS_COLORS[healthStatus.status]}15`,
                  color: HEALTH_STATUS_COLORS[healthStatus.status],
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
                onClick={() => handleNavigate('system-health')}
                size="small"
              />
            </Tooltip>

            {/* Health Alerts */}
            <Tooltip title="Health alerts">
              <IconButton size="small" onClick={handleAlertsMenuOpen}>
                <Badge badgeContent={unreadAlertsCount} color="error">
                  <NotificationsRounded />
                </Badge>
              </IconButton>
            </Tooltip>

            {/* Connection Status */}
            <Chip
              icon={<FiberManualRecordRounded sx={{ fontSize: '12px !important' }} />}
              label={connectionStatus.text}
              color={connectionStatus.color}
              variant="outlined"
              size="small"
            />

            {/* Refresh Button */}
            <IconButton 
              size="small" 
              onClick={() => window.location.reload()}
              title="Refresh Dashboard"
            >
              <RefreshRounded />
            </IconButton>

            {/* User Menu */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" color="text.secondary">
                {user?.displayName || user?.email}
              </Typography>
              <IconButton
                size="small"
                onClick={handleMenuOpen}
                sx={{ ml: 1 }}
              >
                {user?.photoURL ? (
                  <Avatar src={user.photoURL} sx={{ width: 32, height: 32 }} />
                ) : (
                  <AccountCircle />
                )}
              </IconButton>
            </Box>

            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
              <MenuItem onClick={handleMenuClose}>
                <SettingsRounded sx={{ mr: 2 }} />
                Settings
              </MenuItem>
              <MenuItem onClick={handleLogout}>
                <LogoutRounded sx={{ mr: 2 }} />
                Logout
              </MenuItem>
            </Menu>

            {/* Health Alerts Menu */}
            <Menu
              anchorEl={alertsMenuAnchor}
              open={Boolean(alertsMenuAnchor)}
              onClose={handleAlertsMenuClose}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              sx={{ maxHeight: 400 }}
            >
              <Box sx={{ p: 2, minWidth: 300 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                  Health Alerts
                </Typography>
                {unreadAlertsCount === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No new alerts
                  </Typography>
                ) : (
                  <Stack spacing={1}>
                    <Typography variant="body2" color="text.secondary">
                      {unreadAlertsCount} unread alerts
                    </Typography>
                    <Button 
                      size="small" 
                      onClick={() => handleNavigate('system-health')}
                      fullWidth
                    >
                      View All Alerts
                    </Button>
                  </Stack>
                )}
              </Box>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      <Box sx={{ 
        flexGrow: 1, 
        p: 3, 
        bgcolor: 'grey.50',
        minHeight: 'calc(100vh - 64px)'
      }}>
        {children}
      </Box>
    </Box>
  );
};