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
  <Card sx={{ height: '100%', transition: 'all 0.2s', '&:hover': { transform: 'translateY(-2px)', boxShadow: 3 } }}>
    <CardContent sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 48,
            height: 48,
            borderRadius: '12px',
            bgcolor: `${color}15`,
            color: color,
            mr: 2,
          }}
        >
          {icon}
        </Box>
        <Box>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.5, fontWeight: 500 }}>
            {title}
          </Typography>
          {loading ? (
            <Skeleton variant="text" width={80} height={32} />
          ) : (
            <Typography variant="h4" sx={{ fontWeight: 700, color, lineHeight: 1 }}>
              {value}
            </Typography>
          )}
        </Box>
      </Box>
      {subtitle && (
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 1 }}>
          {subtitle}
        </Typography>
      )}
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
      icon: <People sx={{ fontSize: 28 }} />,
      title: 'Active Users',
      value: activeUsers || 0,
      subtitle: 'Currently browsing',
      color: '#1976d2',
    },
    {
      icon: <Search sx={{ fontSize: 28 }} />,
      title: 'Total Searches',
      value: formatNumber(metrics?.totalSearches),
      subtitle: 'Today',
      color: '#9c27b0',
    },
    {
      icon: <TrendingUp sx={{ fontSize: 28 }} />,
      title: 'Conversion Rate',
      value: `${metrics?.conversionRate?.toFixed(1) || 0}%`,
      subtitle: 'Bookings / Searches',
      color: '#4caf50',
    },
    {
      icon: <ExitToApp sx={{ fontSize: 28 }} />,
      title: 'Abandonment Rate',
      value: `${metrics?.abandonmentRate?.toFixed(1) || 0}%`,
      subtitle: 'Sessions abandoned',
      color: '#ff9800',
    },
    {
      icon: <Schedule sx={{ fontSize: 28 }} />,
      title: 'Avg Session Time',
      value: formatDuration(metrics?.averageSessionDuration),
      subtitle: 'Per user',
      color: '#00bcd4',
    },
    {
      icon: <CalendarToday sx={{ fontSize: 28 }} />,
      title: 'Avg Lead Time',
      value: `${metrics?.averageLeadTime || 0}d`,
      subtitle: 'Booking to check-in',
      color: '#ff5722',
    },
  ];

  return (
    <Grid container spacing={3} sx={{ mb: 4 }}>
      {stats.map((stat, index) => (
        <Grid item xs={12} sm={6} md={4} lg={2} key={index}>
          <StatCard {...stat} loading={loading} />
        </Grid>
      ))}
    </Grid>
  );
};