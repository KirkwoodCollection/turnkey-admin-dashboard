import React, { useMemo } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Stack,
  Chip,
  Grid,
  LinearProgress,
  Tooltip,
  Alert,
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  LineChart,
  Line,
  Area,
  AreaChart,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import {
  PriorityHighRounded,
  WarningRounded,
  InfoRounded,
  LowPriorityRounded,
  TrendingUpRounded,
  TrendingDownRounded,
} from '@mui/icons-material';
import { AnalyticsEvent, EVENT_METADATA, EventType } from '../types';

interface EventImportanceChartProps {
  events: AnalyticsEvent[];
  showTrends?: boolean;
  height?: number;
}

interface ImportanceData {
  importance: 'low' | 'medium' | 'high' | 'critical';
  count: number;
  percentage: number;
  color: string;
  icon: React.ReactNode;
  eventTypes: Array<{
    eventType: EventType;
    label: string;
    count: number;
    color: string;
  }>;
}

const IMPORTANCE_CONFIG = {
  critical: {
    color: '#f44336',
    label: 'Critical',
    icon: <PriorityHighRounded />,
    description: 'Mission-critical events that directly impact conversions'
  },
  high: {
    color: '#ff9800',
    label: 'High',
    icon: <WarningRounded />,
    description: 'High-value events that significantly affect user journey'
  },
  medium: {
    color: '#2196f3',
    label: 'Medium',
    icon: <InfoRounded />,
    description: 'Standard events that provide user behavior insights'
  },
  low: {
    color: '#9e9e9e',
    label: 'Low',
    icon: <LowPriorityRounded />,
    description: 'Basic events that provide general usage data'
  }
} as const;

export const EventImportanceChart: React.FC<EventImportanceChartProps> = ({
  events,
  showTrends = true,
  height = 300,
}) => {
  const importanceData = useMemo(() => {
    if (!events || events.length === 0) return [];

    const totalEvents = events.length;
    const importanceCounts = new Map<string, number>();
    const importanceEventBreakdown = new Map<string, Map<EventType, number>>();

    // Count events by importance and type
    events.forEach(event => {
      const eventType = event.eventType as EventType;
      const metadata = EVENT_METADATA[eventType];
      const importance = metadata?.importance || 'medium';

      // Count by importance
      importanceCounts.set(importance, (importanceCounts.get(importance) || 0) + 1);

      // Count by specific event type within importance level
      if (!importanceEventBreakdown.has(importance)) {
        importanceEventBreakdown.set(importance, new Map());
      }
      const importanceMap = importanceEventBreakdown.get(importance)!;
      importanceMap.set(eventType, (importanceMap.get(eventType) || 0) + 1);
    });

    const data: ImportanceData[] = [];

    // Process each importance level
    (['critical', 'high', 'medium', 'low'] as const).forEach(importance => {
      const count = importanceCounts.get(importance) || 0;
      const percentage = totalEvents > 0 ? (count / totalEvents) * 100 : 0;
      const config = IMPORTANCE_CONFIG[importance];

      // Get breakdown of events within this importance level
      const eventTypes = Object.entries(EVENT_METADATA)
        .filter(([_, metadata]) => metadata.importance === importance)
        .map(([eventType, metadata]) => {
          const eventCount = importanceEventBreakdown.get(importance)?.get(eventType as EventType) || 0;
          return {
            eventType: eventType as EventType,
            label: metadata.label,
            count: eventCount,
            color: metadata.color
          };
        })
        .filter(item => item.count > 0)
        .sort((a, b) => b.count - a.count);

      if (count > 0) {
        data.push({
          importance,
          count,
          percentage,
          color: config.color,
          icon: config.icon,
          eventTypes
        });
      }
    });

    return data;
  }, [events]);

  const chartData = importanceData.map(item => ({
    importance: IMPORTANCE_CONFIG[item.importance].label,
    count: item.count,
    percentage: item.percentage,
    fill: item.color
  }));

  const pieData = importanceData.map(item => ({
    name: IMPORTANCE_CONFIG[item.importance].label,
    value: item.count,
    color: item.color
  }));

  const criticalEventsRatio = useMemo(() => {
    const criticalCount = importanceData.find(d => d.importance === 'critical')?.count || 0;
    const highCount = importanceData.find(d => d.importance === 'high')?.count || 0;
    const totalEvents = events.length;
    
    return {
      critical: totalEvents > 0 ? (criticalCount / totalEvents) * 100 : 0,
      highPlusCritical: totalEvents > 0 ? ((criticalCount + highCount) / totalEvents) * 100 : 0,
      isHealthy: totalEvents > 0 ? ((criticalCount + highCount) / totalEvents) >= 0.3 : false // At least 30% should be high value
    };
  }, [importanceData, events.length]);

  const getImportanceIcon = (importance: string) => {
    return IMPORTANCE_CONFIG[importance as keyof typeof IMPORTANCE_CONFIG]?.icon || <InfoRounded />;
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          Event Importance Analysis
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {events.length.toLocaleString()} events prioritized by business impact
        </Typography>

        {/* Health Indicator */}
        <Alert 
          severity={criticalEventsRatio.isHealthy ? "success" : "warning"}
          sx={{ mb: 3 }}
          icon={criticalEventsRatio.isHealthy ? <TrendingUpRounded /> : <TrendingDownRounded />}
        >
          <Typography variant="body2">
            <strong>{criticalEventsRatio.highPlusCritical.toFixed(1)}%</strong> of events are high-value 
            {criticalEventsRatio.isHealthy 
              ? " - Healthy engagement pattern" 
              : " - Consider optimizing for more critical actions"
            }
          </Typography>
        </Alert>

        <Grid container spacing={3}>
          {/* Bar Chart */}
          <Grid item xs={12} md={6}>
            <Box sx={{ height: height }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="importance" />
                  <YAxis />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      `${value.toLocaleString()}`,
                      'Events'
                    ]}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Grid>

          {/* Pie Chart */}
          <Grid item xs={12} md={6}>
            <Box sx={{ height: height }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ value, total }) => 
                      `${((value / total) * 100).toFixed(1)}%`
                    }
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [`${value.toLocaleString()}`, 'Events']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </Grid>
        </Grid>

        {/* Detailed Breakdown */}
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
            Importance Level Breakdown
          </Typography>
          <Stack spacing={3}>
            {importanceData.map((item) => (
              <Box key={item.importance}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                  <Stack direction="row" alignItems="center" gap={1}>
                    <Box sx={{ color: item.color }}>{item.icon}</Box>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {IMPORTANCE_CONFIG[item.importance].label}
                    </Typography>
                  </Stack>
                  <Stack direction="row" alignItems="center" gap={2}>
                    <Typography variant="body2" color="text.secondary">
                      {item.count.toLocaleString()} events
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {item.percentage.toFixed(1)}%
                    </Typography>
                  </Stack>
                </Stack>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {IMPORTANCE_CONFIG[item.importance].description}
                </Typography>

                {/* Progress bar */}
                <LinearProgress
                  variant="determinate"
                  value={item.percentage}
                  sx={{
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: 'grey.200',
                    mb: 2,
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: item.color,
                      borderRadius: 5
                    }
                  }}
                />

                {/* Top events in this importance level */}
                <Box sx={{ ml: 3 }}>
                  <Stack direction="row" flexWrap="wrap" gap={1}>
                    {item.eventTypes.slice(0, 4).map((eventItem) => (
                      <Tooltip
                        key={eventItem.eventType}
                        title={`${eventItem.count} occurrences`}
                      >
                        <Chip
                          label={`${eventItem.label} (${eventItem.count})`}
                          size="small"
                          sx={{
                            backgroundColor: `${eventItem.color}20`,
                            borderColor: eventItem.color,
                            color: eventItem.color,
                            fontWeight: item.importance === 'critical' ? 600 : 400,
                          }}
                          variant="outlined"
                        />
                      </Tooltip>
                    ))}
                    {item.eventTypes.length > 4 && (
                      <Chip
                        label={`+${item.eventTypes.length - 4} more`}
                        size="small"
                        variant="outlined"
                        sx={{ color: 'text.secondary' }}
                      />
                    )}
                  </Stack>
                </Box>
              </Box>
            ))}
          </Stack>
        </Box>

        {/* Key Insights */}
        <Box sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: 'divider' }}>
          <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
            Key Insights
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'error.light', borderRadius: 2 }}>
                <Typography variant="h4" sx={{ fontWeight: 600, color: 'error.main' }}>
                  {criticalEventsRatio.critical.toFixed(1)}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Critical Events
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'warning.light', borderRadius: 2 }}>
                <Typography variant="h4" sx={{ fontWeight: 600, color: 'warning.main' }}>
                  {(importanceData.find(d => d.importance === 'high')?.percentage || 0).toFixed(1)}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  High Priority
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'info.light', borderRadius: 2 }}>
                <Typography variant="h4" sx={{ fontWeight: 600, color: 'info.main' }}>
                  {(importanceData.find(d => d.importance === 'medium')?.percentage || 0).toFixed(1)}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Medium Priority
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'grey.100', borderRadius: 2 }}>
                <Typography variant="h4" sx={{ fontWeight: 600, color: 'grey.700' }}>
                  {(importanceData.find(d => d.importance === 'low')?.percentage || 0).toFixed(1)}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Low Priority
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </CardContent>
    </Card>
  );
};