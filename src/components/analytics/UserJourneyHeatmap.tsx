import React, { useMemo } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Skeleton,
  IconButton,
  Tooltip,
  Chip,
  Paper,
} from '@mui/material';
import {
  Refresh,
  CalendarToday,
  AccessTime,
} from '@mui/icons-material';
import { useHeatmapData } from '../../hooks/useAnalyticsData';
import { TimeRange } from '../../services/analyticsApi';

interface UserJourneyHeatmapProps {
  timeRange: TimeRange;
  propertyId?: string;
}

interface HeatmapCellProps {
  day: string;
  hour: number;
  value: number;
  intensity: number;
  maxValue: number;
  onClick?: () => void;
}

const HeatmapCell: React.FC<HeatmapCellProps> = ({
  day,
  hour,
  value,
  intensity,
  maxValue,
  onClick,
}) => {
  const getIntensityColor = (intensity: number) => {
    const alpha = Math.max(0.1, intensity);
    return `rgba(33, 150, 243, ${alpha})`;
  };

  const formatHour = (hour: number) => {
    if (hour === 0) return '12am';
    if (hour < 12) return `${hour}am`;
    if (hour === 12) return '12pm';
    return `${hour - 12}pm`;
  };

  return (
    <Tooltip
      title={`${day} at ${formatHour(hour)}: ${value} activities`}
      arrow
    >
      <Box
        onClick={onClick}
        sx={{
          width: 20,
          height: 20,
          backgroundColor: getIntensityColor(intensity),
          border: '1px solid',
          borderColor: 'divider',
          cursor: onClick ? 'pointer' : 'default',
          borderRadius: 0.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          '&:hover': onClick ? {
            borderColor: 'primary.main',
            transform: 'scale(1.1)',
            zIndex: 1,
            position: 'relative',
          } : {},
          transition: 'all 0.2s ease-in-out',
        }}
      >
        {value > maxValue * 0.8 && value > 10 && (
          <Typography
            variant="caption"
            sx={{
              fontSize: '0.6rem',
              color: 'white',
              fontWeight: 600,
              textShadow: '1px 1px 1px rgba(0,0,0,0.5)',
            }}
          >
            {value > 99 ? '99+' : value}
          </Typography>
        )}
      </Box>
    </Tooltip>
  );
};

const HeatmapSkeleton: React.FC = () => {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <Box>
      <Box sx={{ display: 'flex', mb: 1, ml: 4 }}>
        {[0, 6, 12, 18].map((hour) => (
          <Box key={hour} sx={{ flex: 6, textAlign: 'center' }}>
            <Skeleton variant="text" width={30} height={16} />
          </Box>
        ))}
      </Box>

      {days.map((day) => (
        <Box key={day} sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
          <Skeleton variant="text" width={30} sx={{ mr: 1 }} />
          {hours.map((hour) => (
            <Skeleton
              key={hour}
              variant="rectangular"
              width={20}
              height={20}
              sx={{ mr: 0.5, borderRadius: 0.5 }}
            />
          ))}
        </Box>
      ))}
    </Box>
  );
};

export const UserJourneyHeatmap: React.FC<UserJourneyHeatmapProps> = ({
  timeRange,
  propertyId,
}) => {
  const { data: heatmapData, isLoading, error, refetch } = useHeatmapData(timeRange, propertyId);

  const { gridData, maxValue, totalActivity } = useMemo(() => {
    if (!heatmapData || heatmapData.length === 0) {
      return { gridData: new Map(), maxValue: 0, totalActivity: 0 };
    }

    const grid = new Map<string, number>();
    let max = 0;
    let total = 0;

    heatmapData.forEach((point) => {
      const key = `${point.day}-${point.hour}`;
      grid.set(key, point.value);
      max = Math.max(max, point.value);
      total += point.value;
    });

    return { gridData: grid, maxValue: max, totalActivity: total };
  }, [heatmapData]);

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const formatHour = (hour: number) => {
    if (hour === 0) return '12am';
    if (hour === 6) return '6am';
    if (hour === 12) return '12pm';
    if (hour === 18) return '6pm';
    return '';
  };

  const handleRefresh = () => {
    refetch();
  };

  const handleCellClick = (day: string, hour: number) => {
    console.log(`Clicked: ${day} at hour ${hour}`);
  };

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CalendarToday color="action" />
            <Typography variant="h6">User Journey Analytics</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {totalActivity > 0 && (
              <Chip
                label={`${totalActivity.toLocaleString()} activities`}
                size="small"
                color="primary"
                variant="outlined"
              />
            )}
            <Tooltip title="Refresh heatmap">
              <IconButton size="small" onClick={handleRefresh}>
                <Refresh />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
          <Chip
            icon={<AccessTime />}
            label="Search Activity by Day & Hour"
            size="small"
            variant="outlined"
            color="info"
          />
          <Chip
            label={`Period: ${timeRange}`}
            size="small"
            variant="outlined"
          />
        </Box>

        {error && (
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <Typography color="error" variant="body2">
              Failed to load heatmap data
            </Typography>
          </Box>
        )}
      </CardContent>

      <Box sx={{ flexGrow: 1, overflow: 'auto', px: 2, pb: 2 }}>
        {isLoading ? (
          <HeatmapSkeleton />
        ) : heatmapData && heatmapData.length > 0 ? (
          <Box>
            <Box sx={{ display: 'flex', mb: 1, ml: 4 }}>
              {[0, 6, 12, 18].map((hour) => (
                <Box key={hour} sx={{ flex: 6, textAlign: 'center' }}>
                  <Typography variant="caption" color="text.secondary">
                    {formatHour(hour)}
                  </Typography>
                </Box>
              ))}
            </Box>

            {days.map((day) => (
              <Box key={day} sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                <Typography
                  variant="caption"
                  sx={{ width: 30, fontWeight: 500, color: 'text.secondary' }}
                >
                  {day}
                </Typography>

                {hours.map((hour) => {
                  const key = `${day}-${hour}`;
                  const value = gridData.get(key) || 0;
                  const intensity = maxValue > 0 ? value / maxValue : 0;

                  return (
                    <Box key={hour} sx={{ mr: 0.5 }}>
                      <HeatmapCell
                        day={day}
                        hour={hour}
                        value={value}
                        intensity={intensity}
                        maxValue={maxValue}
                        onClick={() => handleCellClick(day, hour)}
                      />
                    </Box>
                  );
                })}
              </Box>
            ))}

            <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Activity level:
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography variant="caption" color="text.secondary">Less</Typography>
                {[0.2, 0.4, 0.6, 0.8, 1.0].map((intensity) => (
                  <Box
                    key={intensity}
                    sx={{
                      width: 12,
                      height: 12,
                      backgroundColor: `rgba(33, 150, 243, ${intensity})`,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 0.5,
                    }}
                  />
                ))}
                <Typography variant="caption" color="text.secondary">More</Typography>
              </Box>
            </Box>
          </Box>
        ) : (
          <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
            <CalendarToday sx={{ fontSize: 48, opacity: 0.3, mb: 1 }} />
            <Typography variant="body2">
              No activity data available for {timeRange}
            </Typography>
            <Typography variant="caption" display="block" sx={{ mt: 1 }}>
              Heatmap will show patterns as user activity is recorded
            </Typography>
          </Box>
        )}
      </Box>

      {heatmapData && heatmapData.length > 0 && (
        <Box sx={{ px: 2, pb: 2, borderTop: 1, borderColor: 'divider', pt: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
            Click cells for detailed breakdown • Darker = more activity • Time: {timeRange}
          </Typography>
        </Box>
      )}
    </Card>
  );
};