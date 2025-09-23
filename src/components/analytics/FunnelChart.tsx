import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
  Chip,
  IconButton,
  Tooltip,
  Skeleton,
  Stack,
} from '@mui/material';
import {
  Refresh,
  TrendingDown,
  CheckCircle,
  RadioButtonUnchecked,
  ArrowForward,
} from '@mui/icons-material';
import { useFunnelData } from '../../hooks/useAnalyticsData';
import { TimeRange } from '../../services/analyticsApi';

interface FunnelChartProps {
  timeRange: TimeRange;
  propertyId?: string;
  onStageClick?: (stage: string) => void;
}

interface FunnelStageProps {
  stage: string;
  count: number;
  percentage: number;
  dropOffRate?: number;
  isLast?: boolean;
  maxCount: number;
  onClick?: () => void;
}

const FunnelStage: React.FC<FunnelStageProps> = ({
  stage,
  count,
  percentage,
  dropOffRate,
  isLast = false,
  maxCount,
  onClick,
}) => {
  const widthPercentage = maxCount > 0 ? (count / maxCount) * 100 : 0;

  const getStageColor = (stage: string) => {
    switch (stage.toLowerCase()) {
      case 'destination selection':
        return '#2196F3';
      case 'hotel selection':
        return '#FF9800';
      case 'ibe launched':
        return '#9C27B0';
      case 'arrival date':
        return '#4CAF50';
      case 'room selected':
        return '#FF5722';
      case 'booking confirmed':
        return '#4CAF50';
      default:
        return '#757575';
    }
  };

  const getStageIcon = (stage: string) => {
    if (stage.toLowerCase().includes('confirmed') || stage.toLowerCase().includes('completed')) {
      return <CheckCircle sx={{ fontSize: 20 }} />;
    }
    return <RadioButtonUnchecked sx={{ fontSize: 20 }} />;
  };

  return (
    <Box sx={{ mb: 2 }}>
      <Box
        onClick={onClick}
        sx={{
          cursor: onClick ? 'pointer' : 'default',
          p: 2,
          borderRadius: 2,
          backgroundColor: 'background.paper',
          border: 1,
          borderColor: 'divider',
          position: 'relative',
          '&:hover': onClick ? {
            borderColor: 'primary.main',
            boxShadow: 1,
          } : {},
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ color: getStageColor(stage) }}>
              {getStageIcon(stage)}
            </Box>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {stage}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: getStageColor(stage) }}>
              {count.toLocaleString()}
            </Typography>
            <Chip
              label={`${percentage.toFixed(1)}%`}
              size="small"
              sx={{
                backgroundColor: getStageColor(stage),
                color: 'white',
                fontWeight: 600,
              }}
            />
          </Box>
        </Box>

        <Box sx={{ mb: 1 }}>
          <LinearProgress
            variant="determinate"
            value={widthPercentage}
            sx={{
              height: 8,
              borderRadius: 4,
              backgroundColor: 'action.hover',
              '& .MuiLinearProgress-bar': {
                backgroundColor: getStageColor(stage),
                borderRadius: 4,
              },
            }}
          />
        </Box>

        {dropOffRate !== undefined && dropOffRate > 0 && !isLast && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
            <TrendingDown color="error" sx={{ fontSize: 16 }} />
            <Typography variant="caption" color="error">
              {dropOffRate.toFixed(1)}% drop-off to next stage
            </Typography>
          </Box>
        )}
      </Box>

      {!isLast && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 1 }}>
          <ArrowForward color="action" />
        </Box>
      )}
    </Box>
  );
};

const FunnelSkeleton: React.FC = () => (
  <Box sx={{ mb: 2 }}>
    <Box sx={{ p: 2, borderRadius: 2, border: 1, borderColor: 'divider' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Skeleton variant="circular" width={20} height={20} />
          <Skeleton variant="text" width={120} />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Skeleton variant="text" width={40} />
          <Skeleton variant="rectangular" width={50} height={24} sx={{ borderRadius: 1 }} />
        </Box>
      </Box>
      <Skeleton variant="rectangular" width="100%" height={8} sx={{ borderRadius: 4 }} />
    </Box>
    <Box sx={{ display: 'flex', justifyContent: 'center', my: 1 }}>
      <Skeleton variant="circular" width={24} height={24} />
    </Box>
  </Box>
);

export const FunnelChart: React.FC<FunnelChartProps> = ({
  timeRange,
  propertyId,
  onStageClick,
}) => {
  const { data: funnelData, isLoading, error, refetch } = useFunnelData(timeRange, propertyId);

  const maxCount = funnelData?.[0]?.count ?? 0;
  const totalConversions = funnelData?.[funnelData.length - 1]?.count ?? 0;
  const overallConversionRate = maxCount > 0 ? (totalConversions / maxCount) * 100 : 0;

  const handleRefresh = () => {
    refetch();
  };

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Funnel Stats</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              label={`${overallConversionRate.toFixed(1)}% overall`}
              size="small"
              color="primary"
              variant="outlined"
            />
            <Tooltip title="Refresh funnel data">
              <IconButton size="small" onClick={handleRefresh}>
                <Refresh />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {funnelData && funnelData.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
              <Chip
                label={`${maxCount.toLocaleString()} started`}
                size="small"
                color="info"
                variant="outlined"
              />
              <Chip
                label={`${totalConversions.toLocaleString()} completed`}
                size="small"
                color="success"
                variant="outlined"
              />
              <Chip
                label={`Last ${timeRange}`}
                size="small"
                variant="outlined"
              />
            </Stack>
          </Box>
        )}

        {error && (
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <Typography color="error" variant="body2">
              Failed to load funnel data
            </Typography>
          </Box>
        )}
      </CardContent>

      <Box sx={{ flexGrow: 1, overflow: 'auto', px: 2, pb: 2 }}>
        {isLoading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <FunnelSkeleton key={index} />
          ))
        ) : funnelData && funnelData.length > 0 ? (
          funnelData.map((stage, index) => (
            <FunnelStage
              key={stage.stage}
              stage={stage.stage}
              count={stage.count}
              percentage={stage.percentage}
              dropOffRate={stage.dropOffRate}
              isLast={index === funnelData.length - 1}
              maxCount={maxCount}
              onClick={
                onStageClick
                  ? () => onStageClick(stage.stage)
                  : undefined
              }
            />
          ))
        ) : (
          <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
            <CheckCircle sx={{ fontSize: 48, opacity: 0.3, mb: 1 }} />
            <Typography variant="body2">
              No funnel data available for {timeRange}
            </Typography>
            <Typography variant="caption" display="block" sx={{ mt: 1 }}>
              Data will appear as users progress through the booking flow
            </Typography>
          </Box>
        )}
      </Box>

      {funnelData && funnelData.length > 0 && (
        <Box sx={{ px: 2, pb: 2, borderTop: 1, borderColor: 'divider', pt: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
            Click stages for detailed breakdown • Time period: {timeRange}
          </Typography>
        </Box>
      )}
    </Card>
  );
};