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
} from '@mui/material';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from 'recharts';
import { AnalyticsEvent, EVENT_CATEGORIES, EVENT_METADATA, EventType } from '../types';

interface EventCategoryChartProps {
  events: AnalyticsEvent[];
  showBreakdown?: boolean;
  height?: number;
}

interface CategoryData {
  category: string;
  categoryLabel: string;
  count: number;
  percentage: number;
  color: string;
  events: readonly EventType[];
  breakdown: Array<{
    eventType: EventType;
    label: string;
    count: number;
    color: string;
    importance: string;
  }>;
}

const CATEGORY_COLORS = {
  widget_lifecycle: '#2196f3',
  date_interaction: '#9c27b0',
  navigation: '#607d8b',
  search_modification: '#03a9f4',
  selection_viewing: '#00bcd4',
  booking_process: '#ff9800',
} as const;

export const EventCategoryChart: React.FC<EventCategoryChartProps> = ({
  events,
  showBreakdown = true,
  height = 300,
}) => {
  const categoryData = useMemo(() => {
    if (!events || events.length === 0) return [];

    const totalEvents = events.length;
    const categoryCounts = new Map<string, number>();
    const categoryEventBreakdown = new Map<string, Map<EventType, number>>();

    // Count events by category and type
    events.forEach(event => {
      const eventType = event.eventType as EventType;
      
      // Find which category this event belongs to
      let eventCategory = 'uncategorized';
      for (const [category, categoryEvents] of Object.entries(EVENT_CATEGORIES)) {
        if ((categoryEvents as readonly EventType[]).includes(eventType)) {
          eventCategory = category;
          break;
        }
      }

      // Count by category
      categoryCounts.set(eventCategory, (categoryCounts.get(eventCategory) || 0) + 1);

      // Count by specific event type within category
      if (!categoryEventBreakdown.has(eventCategory)) {
        categoryEventBreakdown.set(eventCategory, new Map());
      }
      const categoryMap = categoryEventBreakdown.get(eventCategory)!;
      categoryMap.set(eventType, (categoryMap.get(eventType) || 0) + 1);
    });

    const data: CategoryData[] = [];

    // Process each category
    Object.entries(EVENT_CATEGORIES).forEach(([category, categoryEvents]) => {
      const count = categoryCounts.get(category) || 0;
      const percentage = totalEvents > 0 ? (count / totalEvents) * 100 : 0;
      
      // Get breakdown of events within this category
      const breakdown = categoryEvents
        .map(eventType => {
          const eventCount = categoryEventBreakdown.get(category)?.get(eventType) || 0;
          const metadata = EVENT_METADATA[eventType];
          return {
            eventType,
            label: metadata?.label || eventType,
            count: eventCount,
            color: metadata?.color || '#757575',
            importance: metadata?.importance || 'medium'
          };
        })
        .filter(item => item.count > 0)
        .sort((a, b) => b.count - a.count);

      if (count > 0) {
        data.push({
          category,
          categoryLabel: category.replace('_', ' ').toUpperCase(),
          count,
          percentage,
          color: CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS] || '#757575',
          events: categoryEvents as readonly EventType[],
          breakdown
        });
      }
    });

    return data.sort((a, b) => b.count - a.count);
  }, [events]);

  const pieData = categoryData.map(item => ({
    name: item.categoryLabel,
    value: item.count,
    color: item.color,
    percentage: item.percentage
  }));

  const barData = categoryData.map(item => ({
    category: item.categoryLabel,
    count: item.count,
    fill: item.color
  }));

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent < 0.05) return null; // Don't show labels for slices smaller than 5%
    
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize={12}
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          Event Distribution by Category
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {events.length.toLocaleString()} events across {categoryData.length} categories
        </Typography>

        <Grid container spacing={3}>
          {/* Pie Chart */}
          <Grid item xs={12} md={6}>
            <Box sx={{ height: height }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomizedLabel}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    formatter={(value: number, name: string) => [
                      `${value.toLocaleString()} events`,
                      name
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </Grid>

          {/* Bar Chart */}
          <Grid item xs={12} md={6}>
            <Box sx={{ height: height }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="category" 
                    tick={{ fontSize: 10 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis />
                  <RechartsTooltip
                    formatter={(value: number) => [`${value.toLocaleString()}`, 'Events']}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Grid>
        </Grid>

        {/* Category Breakdown */}
        {showBreakdown && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
              Category Breakdown
            </Typography>
            <Stack spacing={2}>
              {categoryData.map((categoryItem) => (
                <Box key={categoryItem.category}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                    <Stack direction="row" alignItems="center" gap={1}>
                      <Box
                        sx={{
                          width: 16,
                          height: 16,
                          borderRadius: '50%',
                          backgroundColor: categoryItem.color,
                        }}
                      />
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {categoryItem.categoryLabel}
                      </Typography>
                    </Stack>
                    <Stack direction="row" alignItems="center" gap={2}>
                      <Typography variant="body2" color="text.secondary">
                        {categoryItem.count.toLocaleString()} events
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {categoryItem.percentage.toFixed(1)}%
                      </Typography>
                    </Stack>
                  </Stack>

                  {/* Progress bar */}
                  <LinearProgress
                    variant="determinate"
                    value={categoryItem.percentage}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: 'grey.200',
                      mb: 2,
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: categoryItem.color,
                        borderRadius: 4
                      }
                    }}
                  />

                  {/* Top events in this category */}
                  <Box sx={{ ml: 3 }}>
                    <Stack direction="row" flexWrap="wrap" gap={1}>
                      {categoryItem.breakdown.slice(0, 3).map((eventItem) => (
                        <Tooltip
                          key={eventItem.eventType}
                          title={`${eventItem.count} occurrences • ${eventItem.importance} importance`}
                        >
                          <Chip
                            label={`${eventItem.label} (${eventItem.count})`}
                            size="small"
                            sx={{
                              backgroundColor: `${eventItem.color}20`,
                              borderColor: eventItem.color,
                              color: eventItem.color,
                              fontWeight: eventItem.importance === 'critical' ? 600 : 400,
                            }}
                            variant="outlined"
                          />
                        </Tooltip>
                      ))}
                      {categoryItem.breakdown.length > 3 && (
                        <Chip
                          label={`+${categoryItem.breakdown.length - 3} more`}
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
        )}

        {/* Summary Statistics */}
        <Box sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: 'divider' }}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={4}>
              <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'primary.light', borderRadius: 2 }}>
                <Typography variant="h4" sx={{ fontWeight: 600, color: 'primary.main' }}>
                  {categoryData.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Active Categories
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'success.light', borderRadius: 2 }}>
                <Typography variant="h4" sx={{ fontWeight: 600, color: 'success.main' }}>
                  {categoryData.reduce((sum, cat) => sum + cat.breakdown.length, 0)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Event Types Used
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'info.light', borderRadius: 2 }}>
                <Typography variant="h4" sx={{ fontWeight: 600, color: 'info.main' }}>
                  {Math.max(...categoryData.map(cat => cat.breakdown.length), 0)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Max Events per Category
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </CardContent>
    </Card>
  );
};