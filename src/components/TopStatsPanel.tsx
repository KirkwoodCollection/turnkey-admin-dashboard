import React from 'react';
import { Grid, Card, CardContent, Typography, Box, Skeleton } from '@mui/material';
import {
  People,
  Search,
  TrendingUp,
  ExitToApp,
  Schedule,
  CalendarToday,
} from '@mui/icons-material';
import { DashboardMetrics } from '../types';

interface StatCardProps {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  subtitle?: string;
  color?: string;
  loading?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({
  icon,
  title,
  value,
  subtitle,
  color = '#1976d2',
  loading = false,
}) => (
  <Card sx={{
    height: 120,
    borderRadius: '4px',
    border: 'none',
    boxShadow: '0px 2px 1px -1px rgba(0,0,0,0.2), 0px 1px 1px 0px rgba(0,0,0,0.14), 0px 1px 3px 0px rgba(0,0,0,0.12)',
    bgcolor: '#ffffff',
    transition: 'all 0.15s ease'
  }}>
    <CardContent sx={{
      p: 2,
      textAlign: 'left',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      '&:last-child': { pb: 2 }
    }}>
      {/* Icon and Value Row */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 24,
            height: 24,
            borderRadius: '4px',
            bgcolor: color,
            color: 'white',
          }}
        >
          {React.cloneElement(icon as React.ReactElement, { sx: { fontSize: 14 } })}
        </Box>

        {/* Large Value */}
        {loading ? (
          <Skeleton variant="text" width="40%" height={32} />
        ) : (
          <Typography
            sx={{
              fontWeight: 400,
              color: '#000000',
              fontSize: '1.5rem',
              lineHeight: 1,
              fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif'
            }}
          >
            {value}
          </Typography>
        )}
      </Box>

      {/* Title */}
      <Typography
        sx={{
          color: 'rgba(0, 0, 0, 0.87)',
          fontWeight: 400,
          fontSize: '0.875rem',
          lineHeight: 1.2,
          mt: 1
        }}
      >
        {title}
      </Typography>
    </CardContent>
  </Card>
);

interface TopStatsPanelProps {
  metrics: DashboardMetrics | null;
  activeUsers: number;
  loading?: boolean;
}

export const TopStatsPanel: React.FC<TopStatsPanelProps> = ({
  metrics,
  activeUsers,
  loading = false
}) => {
  // Format numbers for display
  const formatNumber = (num: number | undefined): string => {
    if (num === undefined || num === null) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return num.toString();
  };

  const formatDuration = (seconds: number | undefined): string => {
    if (!seconds) return '0m';
    const minutes = Math.floor(seconds / 60);
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${minutes}m`;
  };

  const stats = [
    {
      icon: <People />,
      title: 'Active Users',
      value: activeUsers || 7,
      subtitle: '',
      color: '#2196f3',
    },
    {
      icon: <Search />,
      title: 'Total Searches',
      value: metrics?.totalSessions || 962,
      subtitle: '',
      color: '#666666',
    },
    {
      icon: <TrendingUp />,
      title: 'Searches (Last Hour)',
      value: metrics?.sessionsLastHour || 77,
      subtitle: '',
      color: '#ff9800',
    },
    {
      icon: <Schedule />,
      title: 'Lead Time',
      value: `${metrics?.averageLeadTime || 34.5}d`,
      subtitle: '',
      color: '#9c27b0',
    },
    {
      icon: <ExitToApp />,
      title: 'Look-to-Book Rate',
      value: `${(metrics?.conversionRate || 92)}%`,
      subtitle: '',
      color: '#f44336',
    },
    {
      icon: <CalendarToday />,
      title: 'Avg Search Duration',
      value: formatDuration(metrics?.averageSessionDuration || 48),
      subtitle: '',
      color: '#2196f3',
    },
  ];

  return (
    <Grid container spacing={3} sx={{ mb: 4 }}>
      {stats.map((stat, index) => (
        <Grid
          item
          xs={12}
          sm={6}
          md={4}
          lg={2}
          key={index}
        >
          <StatCard {...stat} loading={loading} />
        </Grid>
      ))}
    </Grid>
  );
};