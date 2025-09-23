import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Box,
  Skeleton,
  Chip,
  LinearProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  LocationOn,
  Refresh,
  TrendingUp,
} from '@mui/icons-material';
import { useTopDestinations } from '../../hooks/useAnalyticsData';
import { TimeRange } from '../../services/analyticsApi';

interface TopDestinationsProps {
  timeRange: TimeRange;
  propertyId?: string;
  limit?: number;
  onDestinationClick?: (destination: string) => void;
}

interface DestinationItemProps {
  destination: string;
  count: number;
  percentage: number;
  rank: number;
  maxCount: number;
  onClick?: () => void;
  showTrend?: boolean;
}

const DestinationItem: React.FC<DestinationItemProps> = ({
  destination,
  count,
  percentage,
  rank,
  maxCount,
  onClick,
  showTrend = false,
}) => {
  const progressValue = maxCount > 0 ? (count / maxCount) * 100 : 0;

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return '#FFD700';
      case 2:
        return '#C0C0C0';
      case 3:
        return '#CD7F32';
      default:
        return '#1976d2';
    }
  };

  return (
    <ListItem
      button={onClick ? true : false}
      onClick={onClick}
      sx={{
        px: 0,
        py: 1,
        '&:hover': onClick ? { backgroundColor: 'action.hover' } : {},
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <ListItemAvatar>
        <Avatar
          sx={{
            bgcolor: getRankColor(rank),
            color: 'white',
            fontWeight: 600,
            fontSize: '0.875rem',
          }}
        >
          #{rank}
        </Avatar>
      </ListItemAvatar>

      <ListItemText
        primary={
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {destination}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {showTrend && (
                <TrendingUp fontSize="small" color="success" />
              )}
              <Typography variant="body2" color="primary" sx={{ fontWeight: 600 }}>
                {count}
              </Typography>
            </Box>
          </Box>
        }
        secondary={
          <Box sx={{ mt: 0.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                {percentage.toFixed(1)}% of searches
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={progressValue}
              sx={{
                height: 4,
                borderRadius: 2,
                backgroundColor: 'action.hover',
                '& .MuiLinearProgress-bar': {
                  backgroundColor: getRankColor(rank),
                },
              }}
            />
          </Box>
        }
      />
    </ListItem>
  );
};

const DestinationSkeleton: React.FC = () => (
  <ListItem sx={{ px: 0, py: 1 }}>
    <ListItemAvatar>
      <Skeleton variant="circular" width={40} height={40} />
    </ListItemAvatar>
    <ListItemText
      primary={<Skeleton variant="text" width="60%" />}
      secondary={
        <Box sx={{ mt: 0.5 }}>
          <Skeleton variant="text" width="40%" height={16} />
          <Skeleton variant="rectangular" width="100%" height={4} sx={{ mt: 0.5, borderRadius: 2 }} />
        </Box>
      }
    />
  </ListItem>
);

export const TopDestinations: React.FC<TopDestinationsProps> = ({
  timeRange,
  propertyId,
  limit = 10,
  onDestinationClick,
}) => {
  const { data: destinations, isLoading, error, refetch } = useTopDestinations(
    timeRange,
    limit,
    propertyId
  );

  const maxCount = destinations?.[0]?.count ?? 0;

  const handleRefresh = () => {
    refetch();
  };

  const getNoDataMessage = () => {
    switch (timeRange) {
      case '1h':
        return 'No destinations searched in the last hour';
      case '24h':
        return 'No destinations searched today';
      case '7d':
        return 'No destinations searched this week';
      case '30d':
        return 'No destinations searched this month';
      default:
        return 'No destination data available';
    }
  };

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LocationOn color="action" />
            <Typography variant="h6">Top Destinations</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              label={`Last ${timeRange}`}
              size="small"
              variant="outlined"
              color="primary"
            />
            <Tooltip title="Refresh destinations">
              <IconButton size="small" onClick={handleRefresh}>
                <Refresh />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {error && (
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <Typography color="error" variant="body2">
              Failed to load destinations
            </Typography>
          </Box>
        )}
      </CardContent>

      <Box sx={{ flexGrow: 1, overflow: 'auto', px: 2, pb: 2 }}>
        <List sx={{ py: 0 }}>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, index) => (
              <DestinationSkeleton key={index} />
            ))
          ) : destinations && destinations.length > 0 ? (
            destinations.map((destination) => (
              <DestinationItem
                key={destination.destination}
                destination={destination.destination}
                count={destination.count}
                percentage={destination.percentage}
                rank={destination.rank}
                maxCount={maxCount}
                onClick={
                  onDestinationClick
                    ? () => onDestinationClick(destination.destination)
                    : undefined
                }
                showTrend={destination.rank <= 3}
              />
            ))
          ) : (
            <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
              <LocationOn sx={{ fontSize: 48, opacity: 0.3, mb: 1 }} />
              <Typography variant="body2">
                {getNoDataMessage()}
              </Typography>
            </Box>
          )}
        </List>
      </Box>

      {destinations && destinations.length > 0 && (
        <Box sx={{ px: 2, pb: 2, borderTop: 1, borderColor: 'divider', pt: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
            Ranked by search volume • Time period: {timeRange}
          </Typography>
        </Box>
      )}
    </Card>
  );
};