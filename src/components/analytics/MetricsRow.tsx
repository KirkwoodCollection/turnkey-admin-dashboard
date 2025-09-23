import React from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Skeleton,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  People,
  Search,
  Schedule,
  CheckCircle,
  Speed,
  Refresh,
} from '@mui/icons-material';
import { useTopMetrics } from '../../hooks/useAnalyticsData';
import { TimeRange } from '../../services/analyticsApi';

interface MetricsRowProps {
  timeRange: TimeRange;
  propertyId?: string;
  onRefresh?: () => void;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  trend?: number;
  icon: React.ReactNode;
  color: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  isLoading?: boolean;
  subtitle?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit,
  trend,
  icon,
  color,
  isLoading = false,
  subtitle,
}) => {
  const formatValue = (val: string | number) => {
    if (typeof val === 'number') {
      if (val >= 1000000) {
        return `${(val / 1000000).toFixed(1)}M`;
      } else if (val >= 1000) {
        return `${(val / 1000).toFixed(1)}K`;
      }
      return val.toLocaleString();
    }
    return val;
  };

  const getTrendIcon = () => {
    if (trend === undefined) return null;
    if (trend > 0) {
      return <TrendingUp sx={{ fontSize: 16, color: 'success.main' }} />;
    } else if (trend < 0) {
      return <TrendingDown sx={{ fontSize: 16, color: 'error.main' }} />;
    }
    return null;
  };

  const getTrendColor = () => {
    if (trend === undefined) return 'text.secondary';
    return trend >= 0 ? 'success.main' : 'error.main';
  };

  if (isLoading) {
    return (
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Skeleton variant="circular" width={24} height={24} sx={{ mr: 1 }} />
            <Skeleton variant="text" width={80} />
          </Box>
          <Skeleton variant="text" width={60} height={32} sx={{ mb: 1 }} />
          <Skeleton variant="text" width={100} height={20} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ height: '100%', position: 'relative' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box sx={{ color: `${color}.main`, mr: 1 }}>
              {icon}
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
              {title}
            </Typography>
          </Box>
          {trend !== undefined && (
            <Chip
              icon={getTrendIcon()}
              label={`${Math.abs(trend).toFixed(1)}%`}
              size="small"
              sx={{
                height: 20,
                fontSize: '0.7rem',
                color: getTrendColor(),
                backgroundColor: 'transparent',
                border: 1,
                borderColor: getTrendColor(),
              }}
            />
          )}
        </Box>

        <Typography variant="h4" sx={{ fontWeight: 700, color: `${color}.main`, mb: 0.5 }}>
          {formatValue(value)}
          {unit && (
            <Typography component="span" variant="body1" sx={{ ml: 0.5, color: 'text.secondary' }}>
              {unit}
            </Typography>
          )}
        </Typography>

        {subtitle && (
          <Typography variant="caption" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

export const MetricsRow: React.FC<MetricsRowProps> = ({
  timeRange,
  propertyId,
  onRefresh,
}) => {
  const { data: metrics, isLoading, error, refetch } = useTopMetrics(timeRange, propertyId);

  const handleRefresh = () => {
    refetch();
    onRefresh?.();
  };

  const metricsConfig = [
    {
      title: 'Active Users',
      value: metrics?.activeUsers ?? 0,
      unit: '',
      icon: <People />,
      color: 'primary' as const,
      subtitle: 'Currently online',
    },
    {
      title: 'Total Searches',
      value: metrics?.totalSearches ?? 0,
      unit: '',
      icon: <Search />,
      color: 'info' as const,
      subtitle: `Last ${timeRange}`,
    },
    {
      title: 'Lead Time',
      value: metrics?.leadTime ?? 0,
      unit: 'hrs',
      icon: <Schedule />,
      color: 'warning' as const,
      subtitle: 'Avg booking lead',
    },
    {
      title: 'Book Rate',
      value: metrics?.bookRate ?? 0,
      unit: '%',
      icon: <CheckCircle />,
      color: 'success' as const,
      subtitle: 'Conversion rate',
    },
    {
      title: 'Live to Book',
      value: metrics?.liveToBookRate ?? 0,
      unit: '%',
      icon: <Speed />,
      color: 'secondary' as const,
      subtitle: 'Live conversion',
    },
    {
      title: 'Search Duration',
      value: Math.round((metrics?.avgSearchDuration ?? 0) / 60),
      unit: 'min',
      icon: <Schedule />,
      color: 'info' as const,
      subtitle: 'Avg session time',
    },
  ];

  if (error) {
    return (
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Key Metrics</Typography>
          <Tooltip title="Retry loading metrics">
            <IconButton size="small" onClick={handleRefresh}>
              <Refresh />
            </IconButton>
          </Tooltip>
        </Box>
        <Card>
          <CardContent>
            <Typography color="error" variant="body2" sx={{ textAlign: 'center', py: 2 }}>
              Failed to load metrics data
            </Typography>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Key Metrics</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip
            label="Live"
            size="small"
            color="success"
            sx={{ animation: 'pulse 2s infinite' }}
          />
          <Tooltip title="Refresh metrics">
            <IconButton size="small" onClick={handleRefresh}>
              <Refresh />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Grid container spacing={2}>
        {metricsConfig.map((metric, index) => (
          <Grid item xs={12} sm={6} md={2} key={index}>
            <MetricCard
              title={metric.title}
              value={metric.value}
              unit={metric.unit}
              icon={metric.icon}
              color={metric.color}
              isLoading={isLoading}
              subtitle={metric.subtitle}
            />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};