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
  Badge,
} from '@mui/material';
import {
  Hotel,
  Refresh,
  TrendingUp,
  BookmarkBorder,
  Search as SearchIcon,
} from '@mui/icons-material';
import { useTopHotels } from '../../hooks/useAnalyticsData';
import { TimeRange } from '../../services/analyticsApi';

interface TopHotelsProps {
  timeRange: TimeRange;
  propertyId?: string;
  limit?: number;
  onHotelClick?: (hotelName: string) => void;
}

interface HotelItemProps {
  hotelName: string;
  searches: number;
  bookings: number;
  conversionRate: number;
  rank: number;
  maxSearches: number;
  onClick?: () => void;
}

const HotelItem: React.FC<HotelItemProps> = ({
  hotelName,
  searches,
  bookings,
  conversionRate,
  rank,
  maxSearches,
  onClick,
}) => {
  const progressValue = maxSearches > 0 ? (searches / maxSearches) * 100 : 0;

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

  const getConversionColor = (rate: number) => {
    if (rate >= 10) return 'success';
    if (rate >= 5) return 'warning';
    return 'default';
  };

  return (
    <ListItem
      button={onClick ? true : false}
      onClick={onClick}
      sx={{
        px: 0,
        py: 1.5,
        '&:hover': onClick ? { backgroundColor: 'action.hover' } : {},
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <ListItemAvatar>
        <Badge
          badgeContent={bookings > 0 ? bookings : null}
          color="secondary"
          max={99}
          anchorOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
        >
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
        </Badge>
      </ListItemAvatar>

      <ListItemText
        primary={
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2" sx={{ fontWeight: 500, maxWidth: '60%' }} noWrap>
              {hotelName}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip
                label={`${conversionRate.toFixed(1)}%`}
                size="small"
                color={getConversionColor(conversionRate)}
                variant="outlined"
                sx={{ minWidth: 50, fontSize: '0.7rem' }}
              />
            </Box>
          </Box>
        }
        secondary={
          <Box sx={{ mt: 0.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <SearchIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                  <Typography variant="caption" color="text.secondary">
                    {searches} searches
                  </Typography>
                </Box>
                {bookings > 0 && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <BookmarkBorder sx={{ fontSize: 14, color: 'success.main' }} />
                    <Typography variant="caption" color="success.main">
                      {bookings} bookings
                    </Typography>
                  </Box>
                )}
              </Box>
              {conversionRate > 0 && (
                <TrendingUp sx={{ fontSize: 14, color: 'success.main' }} />
              )}
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

const HotelSkeleton: React.FC = () => (
  <ListItem sx={{ px: 0, py: 1.5 }}>
    <ListItemAvatar>
      <Skeleton variant="circular" width={40} height={40} />
    </ListItemAvatar>
    <ListItemText
      primary={
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Skeleton variant="text" width="60%" />
          <Skeleton variant="rectangular" width={50} height={20} sx={{ borderRadius: 1 }} />
        </Box>
      }
      secondary={
        <Box sx={{ mt: 0.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
            <Skeleton variant="text" width="70%" height={16} />
          </Box>
          <Skeleton variant="rectangular" width="100%" height={4} sx={{ borderRadius: 2 }} />
        </Box>
      }
    />
  </ListItem>
);

export const TopHotels: React.FC<TopHotelsProps> = ({
  timeRange,
  propertyId,
  limit = 10,
  onHotelClick,
}) => {
  const { data: hotels, isLoading, error, refetch } = useTopHotels(
    timeRange,
    limit,
    propertyId
  );

  const maxSearches = hotels?.[0]?.searches ?? 0;
  const totalBookings = hotels?.reduce((sum, hotel) => sum + hotel.bookings, 0) ?? 0;

  const handleRefresh = () => {
    refetch();
  };

  const getNoDataMessage = () => {
    switch (timeRange) {
      case '1h':
        return 'No hotel searches in the last hour';
      case '24h':
        return 'No hotel searches today';
      case '7d':
        return 'No hotel searches this week';
      case '30d':
        return 'No hotel searches this month';
      default:
        return 'No hotel data available';
    }
  };

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Hotel color="action" />
            <Typography variant="h6">Top Hotels</Typography>
            {totalBookings > 0 && (
              <Chip
                label={`${totalBookings} bookings`}
                size="small"
                color="success"
                variant="outlined"
              />
            )}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              label={`Last ${timeRange}`}
              size="small"
              variant="outlined"
              color="primary"
            />
            <Tooltip title="Refresh hotels">
              <IconButton size="small" onClick={handleRefresh}>
                <Refresh />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <Chip
            icon={<SearchIcon />}
            label="Sorted by searches"
            size="small"
            variant="outlined"
            color="info"
          />
          <Chip
            icon={<TrendingUp />}
            label="Conversion rate"
            size="small"
            variant="outlined"
            color="success"
          />
        </Box>

        {error && (
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <Typography color="error" variant="body2">
              Failed to load hotels
            </Typography>
          </Box>
        )}
      </CardContent>

      <Box sx={{ flexGrow: 1, overflow: 'auto', px: 2, pb: 2 }}>
        <List sx={{ py: 0 }}>
          {isLoading ? (
            Array.from({ length: 6 }).map((_, index) => (
              <HotelSkeleton key={index} />
            ))
          ) : hotels && hotels.length > 0 ? (
            hotels.map((hotel) => (
              <HotelItem
                key={hotel.hotelName}
                hotelName={hotel.hotelName}
                searches={hotel.searches}
                bookings={hotel.bookings}
                conversionRate={hotel.conversionRate}
                rank={hotel.rank}
                maxSearches={maxSearches}
                onClick={
                  onHotelClick
                    ? () => onHotelClick(hotel.hotelName)
                    : undefined
                }
              />
            ))
          ) : (
            <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
              <Hotel sx={{ fontSize: 48, opacity: 0.3, mb: 1 }} />
              <Typography variant="body2">
                {getNoDataMessage()}
              </Typography>
            </Box>
          )}
        </List>
      </Box>

      {hotels && hotels.length > 0 && (
        <Box sx={{ px: 2, pb: 2, borderTop: 1, borderColor: 'divider', pt: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
            Ranked by search volume • Scroll for more • Time: {timeRange}
          </Typography>
        </Box>
      )}
    </Card>
  );
};