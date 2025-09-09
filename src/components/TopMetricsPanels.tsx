import React from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  Box, 
  List, 
  ListItem, 
  ListItemText,
  LinearProgress,
  Chip,
  Skeleton
} from '@mui/material';
import { TrendingUp, Place, Hotel } from '@mui/icons-material';

interface TopMetricsPanelsProps {
  topDestinations: Array<{
    destination: string;
    count: number;
    percentage: number;
  }>;
  topHotels: Array<{
    hotel: string;
    searches: number;
    bookings: number;
    conversionRate: number;
  }>;
  funnelStats: Array<{
    stage: string;
    count: number;
    percentage: number;
    dropOffRate: number;
  }>;
  loading?: boolean;
}

const MetricCard: React.FC<{
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  loading?: boolean;
}> = ({ title, icon, children, loading }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          width: 40,
          height: 40,
          borderRadius: '8px',
          bgcolor: 'primary.light',
          color: 'primary.contrastText',
          mr: 2
        }}>
          {icon}
        </Box>
        <Typography variant="h6" component="h3">
          {title}
        </Typography>
      </Box>
      {loading ? <Skeleton variant="rectangular" height={200} /> : children}
    </CardContent>
  </Card>
);

export const TopMetricsPanels: React.FC<TopMetricsPanelsProps> = ({
  topDestinations,
  topHotels,
  funnelStats,
  loading = false
}) => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Top Destinations */}
      <MetricCard
        title="Top Destinations"
        icon={<Place fontSize="small" />}
        loading={loading}
      >
        <List dense sx={{ py: 0 }}>
          {topDestinations.slice(0, 5).map((destination, index) => (
            <ListItem key={index} sx={{ px: 0, py: 1 }}>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {destination.destination}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        {destination.count}
                      </Typography>
                      <Chip 
                        label={`${destination.percentage}%`} 
                        size="small" 
                        color="primary" 
                        variant="outlined"
                      />
                    </Box>
                  </Box>
                }
                secondary={
                  <LinearProgress 
                    variant="determinate" 
                    value={destination.percentage} 
                    sx={{ 
                      height: 6, 
                      borderRadius: 3,
                      bgcolor: 'grey.200',
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 3,
                      }
                    }} 
                  />
                }
              />
            </ListItem>
          ))}
        </List>
      </MetricCard>

      {/* Top Hotels */}
      <MetricCard
        title="Top Hotels"
        icon={<Hotel fontSize="small" />}
        loading={loading}
      >
        <List dense sx={{ py: 0 }}>
          {topHotels.slice(0, 5).map((hotel, index) => (
            <ListItem key={index} sx={{ px: 0, py: 1 }}>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 500, maxWidth: '60%' }} noWrap>
                      {hotel.hotel}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        {hotel.searches} searches
                      </Typography>
                      <Chip 
                        label={`${hotel.conversionRate}%`} 
                        size="small" 
                        color={hotel.conversionRate > 5 ? "success" : "warning"} 
                        variant="outlined"
                      />
                    </Box>
                  </Box>
                }
                secondary={
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption" color="text.secondary">
                      {hotel.bookings} bookings
                    </Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={hotel.conversionRate > 100 ? 100 : hotel.conversionRate} 
                      sx={{ 
                        width: '60%',
                        height: 4, 
                        borderRadius: 2,
                        bgcolor: 'grey.200',
                        '& .MuiLinearProgress-bar': {
                          borderRadius: 2,
                          bgcolor: hotel.conversionRate > 5 ? 'success.main' : 'warning.main'
                        }
                      }} 
                    />
                  </Box>
                }
              />
            </ListItem>
          ))}
        </List>
      </MetricCard>

      {/* Funnel Stats */}
      <MetricCard
        title="Funnel Stats"
        icon={<TrendingUp fontSize="small" />}
        loading={loading}
      >
        <List dense sx={{ py: 0 }}>
          {funnelStats.slice(0, 6).map((stage, index) => (
            <ListItem key={index} sx={{ px: 0, py: 0.5 }}>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                      {stage.stage}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 40, textAlign: 'right' }}>
                        {stage.count.toLocaleString()}
                      </Typography>
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          minWidth: 40, 
                          textAlign: 'right',
                          color: stage.dropOffRate > 20 ? 'error.main' : 'text.secondary'
                        }}
                      >
                        {stage.percentage}%
                      </Typography>
                    </Box>
                  </Box>
                }
              />
            </ListItem>
          ))}
        </List>
        
        {/* Summary Stats */}
        <Box sx={{ 
          mt: 2, 
          pt: 2, 
          borderTop: '1px solid', 
          borderColor: 'divider',
          display: 'flex',
          justifyContent: 'space-around',
          textAlign: 'center'
        }}>
          <Box>
            <Typography variant="h6" color="primary">
              {funnelStats[0]?.count.toLocaleString() || '0'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Total Visits
            </Typography>
          </Box>
          <Box>
            <Typography variant="h6" color="success.main">
              {funnelStats[funnelStats.length - 1]?.count.toLocaleString() || '0'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Conversions
            </Typography>
          </Box>
          <Box>
            <Typography variant="h6" color="warning.main">
              {funnelStats.length > 0 
                ? `${((funnelStats[funnelStats.length - 1]?.count || 0) / (funnelStats[0]?.count || 1) * 100).toFixed(1)}%`
                : '0%'
              }
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Overall Rate
            </Typography>
          </Box>
        </Box>
      </MetricCard>
    </Box>
  );
};