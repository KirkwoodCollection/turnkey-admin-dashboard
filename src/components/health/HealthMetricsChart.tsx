import React, { useMemo, useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Stack,
  FormControl,
  Select,
  MenuItem,
  SelectChangeEvent,
  Chip,
  Alert,
  Skeleton,
  ButtonGroup,
  Button,
} from '@mui/material';
import {
  TimelineRounded,
  SpeedRounded,
  ErrorRounded,
  TrendingUpRounded,
  TrendingDownRounded,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
} from 'recharts';
import { HealthHistoryPoint, SystemMetrics, HEALTH_STATUS_COLORS } from '../../types';

interface HealthMetricsChartProps {
  healthHistory: HealthHistoryPoint[];
  systemMetrics: SystemMetrics | null;
  isLoading?: boolean;
  error?: string | null;
  onTimeRangeChange?: (range: '1h' | '6h' | '24h' | '7d') => void;
  currentTimeRange?: '1h' | '6h' | '24h' | '7d';
}

type ChartType = 'response_time' | 'error_rate' | 'uptime' | 'service_status';
type ViewType = 'line' | 'area' | 'bar';

export const HealthMetricsChart: React.FC<HealthMetricsChartProps> = ({
  healthHistory,
  systemMetrics,
  isLoading = false,
  error = null,
  onTimeRangeChange,
  currentTimeRange = '1h',
}) => {
  const [selectedChart, setSelectedChart] = useState<ChartType>('response_time');
  const [viewType, setViewType] = useState<ViewType>('line');
  const [selectedService, setSelectedService] = useState<string>('all');

  const timeRangeLabels = {
    '1h': '1 Hour',
    '6h': '6 Hours',
    '24h': '24 Hours',
    '7d': '7 Days',
  };

  const availableServices = useMemo(() => {
    const services = new Set<string>();
    healthHistory.forEach(point => services.add(point.service_name));
    return ['all', ...Array.from(services).sort()];
  }, [healthHistory]);

  const chartData = useMemo(() => {
    if (!healthHistory.length) return [];

    // Filter by service if specific service selected
    const filteredHistory = selectedService === 'all' 
      ? healthHistory 
      : healthHistory.filter(point => point.service_name === selectedService);

    // Group by timestamp
    const groupedData = new Map<string, {
      timestamp: string;
      services: HealthHistoryPoint[];
      avg_response_time: number;
      error_count: number;
      healthy_count: number;
      total_count: number;
    }>();

    filteredHistory.forEach(point => {
      const key = point.timestamp;
      if (!groupedData.has(key)) {
        groupedData.set(key, {
          timestamp: key,
          services: [],
          avg_response_time: 0,
          error_count: 0,
          healthy_count: 0,
          total_count: 0,
        });
      }

      const group = groupedData.get(key)!;
      group.services.push(point);
      group.total_count++;
      
      if (point.status === 'healthy') {
        group.healthy_count++;
      } else {
        group.error_count++;
      }
    });

    // Calculate aggregated metrics
    const result = Array.from(groupedData.values()).map(group => {
      const avgResponseTime = group.services.reduce((sum, s) => sum + s.response_time_ms, 0) / group.services.length;
      const errorRate = (group.error_count / group.total_count) * 100;
      const uptimePercentage = (group.healthy_count / group.total_count) * 100;
      
      return {
        timestamp: group.timestamp,
        time: new Date(group.timestamp).toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          ...(currentTimeRange === '7d' && { 
            month: 'short', 
            day: 'numeric' 
          })
        }),
        avg_response_time: Math.round(avgResponseTime),
        error_rate: Number(errorRate.toFixed(2)),
        uptime_percentage: Number(uptimePercentage.toFixed(1)),
        healthy_services: group.healthy_count,
        total_services: group.total_count,
        error_services: group.error_count,
      };
    }).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return result;
  }, [healthHistory, selectedService, currentTimeRange]);

  const handleChartTypeChange = (event: SelectChangeEvent<ChartType>) => {
    setSelectedChart(event.target.value as ChartType);
  };

  const handleServiceChange = (event: SelectChangeEvent<string>) => {
    setSelectedService(event.target.value);
  };

  const formatTooltipValue = (value: number, name: string) => {
    switch (name) {
      case 'avg_response_time':
        return [`${value}ms`, 'Avg Response Time'];
      case 'error_rate':
        return [`${value}%`, 'Error Rate'];
      case 'uptime_percentage':
        return [`${value}%`, 'Uptime'];
      default:
        return [value, name];
    }
  };

  const renderChart = () => {
    if (!chartData.length) {
      return (
        <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
          <Typography variant="h6">No data available</Typography>
          <Typography variant="body2">
            No health history data found for the selected time range
          </Typography>
        </Box>
      );
    }

    const commonProps = {
      data: chartData,
      margin: { top: 5, right: 30, left: 20, bottom: 5 },
    };

    switch (selectedChart) {
      case 'response_time':
        return viewType === 'area' ? (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip formatter={formatTooltipValue} />
            <Area 
              type="monotone" 
              dataKey="avg_response_time" 
              stroke="#2196f3" 
              fill="#2196f3" 
              fillOpacity={0.3}
            />
          </AreaChart>
        ) : (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip formatter={formatTooltipValue} />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="avg_response_time" 
              stroke="#2196f3" 
              strokeWidth={2}
              dot={{ fill: '#2196f3', strokeWidth: 2, r: 4 }}
            />
          </LineChart>
        );

      case 'error_rate':
        return viewType === 'bar' ? (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip formatter={formatTooltipValue} />
            <Bar dataKey="error_rate" fill="#f44336" />
          </BarChart>
        ) : (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip formatter={formatTooltipValue} />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="error_rate" 
              stroke="#f44336" 
              strokeWidth={2}
              dot={{ fill: '#f44336', strokeWidth: 2, r: 4 }}
            />
          </LineChart>
        );

      case 'uptime':
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis domain={[0, 100]} />
            <Tooltip formatter={formatTooltipValue} />
            <Area 
              type="monotone" 
              dataKey="uptime_percentage" 
              stroke="#4caf50" 
              fill="#4caf50" 
              fillOpacity={0.3}
            />
          </AreaChart>
        );

      case 'service_status':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="healthy_services" stackId="a" fill="#4caf50" name="Healthy" />
            <Bar dataKey="error_services" stackId="a" fill="#f44336" name="Unhealthy" />
          </BarChart>
        );

      default:
        return null;
    }
  };

  if (error) {
    return (
      <Card>
        <CardContent>
          <Alert severity="error">
            Failed to load health metrics: {error}
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TimelineRounded />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Health Metrics Over Time
            </Typography>
            {systemMetrics && (
              <Chip 
                label={`${systemMetrics.active_services} Services Active`}
                size="small"
                color="primary"
                variant="outlined"
              />
            )}
          </Box>
          
          {onTimeRangeChange && (
            <ButtonGroup variant="outlined" size="small">
              {(['1h', '6h', '24h', '7d'] as const).map(range => (
                <Button
                  key={range}
                  variant={currentTimeRange === range ? 'contained' : 'outlined'}
                  onClick={() => onTimeRangeChange(range)}
                >
                  {timeRangeLabels[range]}
                </Button>
              ))}
            </ButtonGroup>
          )}
        </Stack>

        {/* System Summary Cards */}
        {systemMetrics && (
          <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1,
              p: 2,
              bgcolor: 'primary.light',
              borderRadius: 1,
              minWidth: 140,
            }}>
              <SpeedRounded sx={{ color: 'primary.main' }} />
              <Box>
                <Typography variant="body2" color="text.secondary">Avg Response</Typography>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {systemMetrics.overall_response_time.toFixed(0)}ms
                </Typography>
              </Box>
            </Box>

            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1,
              p: 2,
              bgcolor: systemMetrics.error_rate > 5 ? 'error.light' : 'success.light',
              borderRadius: 1,
              minWidth: 140,
            }}>
              <ErrorRounded sx={{ color: systemMetrics.error_rate > 5 ? 'error.main' : 'success.main' }} />
              <Box>
                <Typography variant="body2" color="text.secondary">Error Rate</Typography>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {systemMetrics.error_rate.toFixed(2)}%
                </Typography>
              </Box>
            </Box>

            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1,
              p: 2,
              bgcolor: 'success.light',
              borderRadius: 1,
              minWidth: 140,
            }}>
              {systemMetrics.uptime_percentage >= 99 ? (
                <TrendingUpRounded sx={{ color: 'success.main' }} />
              ) : (
                <TrendingDownRounded sx={{ color: 'warning.main' }} />
              )}
              <Box>
                <Typography variant="body2" color="text.secondary">Uptime</Typography>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {systemMetrics.uptime_percentage.toFixed(1)}%
                </Typography>
              </Box>
            </Box>
          </Stack>
        )}

        {/* Chart controls */}
        <Stack direction="row" spacing={2} sx={{ mb: 3 }} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <Select
              value={selectedChart}
              onChange={handleChartTypeChange}
            >
              <MenuItem value="response_time">Response Time</MenuItem>
              <MenuItem value="error_rate">Error Rate</MenuItem>
              <MenuItem value="uptime">Uptime Percentage</MenuItem>
              <MenuItem value="service_status">Service Status</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <Select
              value={selectedService}
              onChange={handleServiceChange}
            >
              <MenuItem value="all">All Services</MenuItem>
              {availableServices.slice(1).map(service => (
                <MenuItem key={service} value={service}>
                  {service.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {selectedChart === 'response_time' || selectedChart === 'error_rate' ? (
            <ButtonGroup variant="outlined" size="small">
              <Button
                variant={viewType === 'line' ? 'contained' : 'outlined'}
                onClick={() => setViewType('line')}
              >
                Line
              </Button>
              <Button
                variant={viewType === 'area' ? 'contained' : 'outlined'}
                onClick={() => setViewType('area')}
              >
                Area
              </Button>
              {selectedChart === 'error_rate' && (
                <Button
                  variant={viewType === 'bar' ? 'contained' : 'outlined'}
                  onClick={() => setViewType('bar')}
                >
                  Bar
                </Button>
              )}
            </ButtonGroup>
          ) : null}
        </Stack>

        {/* Chart */}
        <Box sx={{ height: 300 }}>
          {isLoading ? (
            <Skeleton variant="rectangular" height={300} />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              {renderChart()}
            </ResponsiveContainer>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};