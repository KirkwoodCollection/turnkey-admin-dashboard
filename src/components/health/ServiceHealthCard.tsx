import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Chip,
  Box,
  LinearProgress,
  Tooltip,
  IconButton,
  Collapse,
  Stack,
  Divider,
} from '@mui/material';
import {
  ExpandMore,
  ExpandLess,
  CheckCircleRounded,
  WarningRounded,
  ErrorRounded,
  InfoRounded,
  TimerRounded,
  SpeedRounded,
} from '@mui/icons-material';
import { ServiceHealthStatus, HEALTH_STATUS_COLORS, HEALTH_STATUS_LABELS } from '../../types';

interface ServiceHealthCardProps {
  service: ServiceHealthStatus;
  onServiceClick?: (serviceId: string) => void;
  expanded?: boolean;
  onToggleExpanded?: () => void;
  showMetrics?: boolean;
}

export const ServiceHealthCard: React.FC<ServiceHealthCardProps> = ({
  service,
  onServiceClick,
  expanded = false,
  onToggleExpanded,
  showMetrics = true
}) => {
  const statusColor = HEALTH_STATUS_COLORS[service.status];
  const statusLabel = HEALTH_STATUS_LABELS[service.status];
  
  const getStatusIcon = (status: ServiceHealthStatus['status']) => {
    switch (status) {
      case 'healthy':
        return <CheckCircleRounded sx={{ color: statusColor }} />;
      case 'degraded':
        return <WarningRounded sx={{ color: statusColor }} />;
      case 'unhealthy':
        return <ErrorRounded sx={{ color: statusColor }} />;
      default:
        return <InfoRounded />;
    }
  };

  const formatUptime = (uptimeSeconds?: number) => {
    if (!uptimeSeconds) return 'Unknown';
    
    const days = Math.floor(uptimeSeconds / 86400);
    const hours = Math.floor((uptimeSeconds % 86400) / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const formatResponseTime = (responseTimeMs: number) => {
    if (responseTimeMs < 100) return { color: 'success.main', label: `${responseTimeMs}ms` };
    if (responseTimeMs < 500) return { color: 'warning.main', label: `${responseTimeMs}ms` };
    return { color: 'error.main', label: `${responseTimeMs}ms` };
  };

  const responseTime = formatResponseTime(service.response_time_ms);

  return (
    <Card
      variant="outlined"
      sx={{
        transition: 'all 0.2s ease-in-out',
        cursor: onServiceClick ? 'pointer' : 'default',
        '&:hover': onServiceClick ? {
          boxShadow: 2,
          transform: 'translateY(-2px)',
        } : {},
        borderLeft: `4px solid ${statusColor}`,
      }}
      onClick={() => onServiceClick?.(service.service_name)}
    >
      <CardContent sx={{ pb: expanded ? 1 : 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
            {getStatusIcon(service.status)}
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                {service.service_name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </Typography>
              <Chip
                label={statusLabel}
                size="small"
                sx={{
                  bgcolor: `${statusColor}15`,
                  color: statusColor,
                  fontWeight: 600,
                  fontSize: '0.75rem',
                }}
              />
            </Box>
          </Box>
          
          {onToggleExpanded && (
            <IconButton 
              size="small" 
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpanded();
              }}
            >
              {expanded ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          )}
        </Box>

        <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <SpeedRounded sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography variant="body2" sx={{ color: responseTime.color, fontWeight: 600 }}>
              {responseTime.label}
            </Typography>
          </Box>
          
          {service.uptime_seconds && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <TimerRounded sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography variant="body2" color="text.secondary">
                {formatUptime(service.uptime_seconds)}
              </Typography>
            </Box>
          )}

          {service.version && (
            <Chip 
              label={`v${service.version}`}
              size="small" 
              variant="outlined"
              sx={{ fontSize: '0.7rem', height: '20px' }}
            />
          )}
        </Stack>

        {service.error_message && (
          <Box sx={{ 
            bgcolor: 'error.light',
            color: 'error.contrastText', 
            p: 1, 
            borderRadius: 1, 
            mb: 2,
            fontSize: '0.875rem'
          }}>
            <Typography variant="body2">
              <strong>Error:</strong> {service.error_message}
            </Typography>
          </Box>
        )}

        <Collapse in={expanded} timeout="auto">
          <Divider sx={{ mb: 2 }} />
          
          {/* Service Metrics */}
          {showMetrics && service.metrics && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                Metrics
              </Typography>
              <Stack spacing={2}>
                {service.metrics.cpu_usage !== undefined && (
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2" color="text.secondary">CPU Usage</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {service.metrics.cpu_usage.toFixed(1)}%
                      </Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={service.metrics.cpu_usage} 
                      sx={{ 
                        height: 6, 
                        borderRadius: 3,
                        bgcolor: 'grey.200',
                        '& .MuiLinearProgress-bar': {
                          bgcolor: service.metrics.cpu_usage > 80 ? 'error.main' : 
                                  service.metrics.cpu_usage > 60 ? 'warning.main' : 'success.main'
                        }
                      }}
                    />
                  </Box>
                )}

                {service.metrics.memory_usage !== undefined && (
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2" color="text.secondary">Memory Usage</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {service.metrics.memory_usage.toFixed(1)}%
                      </Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={service.metrics.memory_usage} 
                      sx={{ 
                        height: 6, 
                        borderRadius: 3,
                        bgcolor: 'grey.200',
                        '& .MuiLinearProgress-bar': {
                          bgcolor: service.metrics.memory_usage > 85 ? 'error.main' : 
                                  service.metrics.memory_usage > 70 ? 'warning.main' : 'success.main'
                        }
                      }}
                    />
                  </Box>
                )}

                <Stack direction="row" spacing={4}>
                  {service.metrics.request_count !== undefined && (
                    <Box>
                      <Typography variant="body2" color="text.secondary">Requests</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {service.metrics.request_count.toLocaleString()}
                      </Typography>
                    </Box>
                  )}

                  {service.metrics.error_rate !== undefined && (
                    <Box>
                      <Typography variant="body2" color="text.secondary">Error Rate</Typography>
                      <Typography variant="h6" sx={{ 
                        fontWeight: 600,
                        color: service.metrics.error_rate > 5 ? 'error.main' : 
                               service.metrics.error_rate > 1 ? 'warning.main' : 'success.main'
                      }}>
                        {service.metrics.error_rate.toFixed(2)}%
                      </Typography>
                    </Box>
                  )}

                  {service.metrics.active_connections !== undefined && (
                    <Box>
                      <Typography variant="body2" color="text.secondary">Connections</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {service.metrics.active_connections}
                      </Typography>
                    </Box>
                  )}
                </Stack>
              </Stack>
            </Box>
          )}

          {/* Dependencies */}
          {service.dependencies && Object.keys(service.dependencies).length > 0 && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                Dependencies
              </Typography>
              <Stack spacing={1}>
                {Object.entries(service.dependencies).map(([depName, dep]) => (
                  <Box 
                    key={depName}
                    sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      p: 1,
                      bgcolor: 'grey.50',
                      borderRadius: 1
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {getStatusIcon(dep.status)}
                      <Typography variant="body2">{depName}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        {dep.response_time_ms}ms
                      </Typography>
                      {dep.error && (
                        <Tooltip title={dep.error}>
                          <ErrorRounded sx={{ fontSize: 16, color: 'error.main' }} />
                        </Tooltip>
                      )}
                    </Box>
                  </Box>
                ))}
              </Stack>
            </Box>
          )}
        </Collapse>
      </CardContent>
    </Card>
  );
};