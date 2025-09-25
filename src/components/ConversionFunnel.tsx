import React, { useMemo, useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Grid,
  Stack,
  Chip,
  Button,
  ButtonGroup,
  Tooltip,
  LinearProgress,
  IconButton,
} from '@mui/material';
import {
  TrendingDownRounded,
  TrendingUpRounded,
  ExpandMoreRounded,
  ExpandLessRounded,
} from '@mui/icons-material';
import { FunnelChart } from './FunnelChart';
import { AnalyticsEvent, EventType, EVENT_METADATA } from '../types';

// Enhanced funnel stages for 28-event system
export const ENHANCED_FUNNEL_STAGES = [
  'Widget Loaded',
  'Booking Opened', 
  'Dates Selected',
  'Search Submitted',
  'Room Viewed',
  'Room Selected',
  'Booking Initiated',
  'Payment Started',
  'Details Completed',
  'Reservation Confirmed'
] as const;

// Detailed stage mapping to specific events
const STAGE_EVENT_MAPPING = {
  'Widget Loaded': [EventType.WIDGET_INITIALIZED],
  'Booking Opened': [EventType.IBE_LAUNCHED],
  'Dates Selected': [EventType.CHECKIN_DATE_SELECTED, EventType.CHECKOUT_DATE_SELECTED],
  'Search Submitted': [EventType.SEARCH_SUBMITTED],
  'Room Viewed': [EventType.ROOM_DETAILS_VIEWED, EventType.RATE_DETAILS_VIEWED],
  'Room Selected': [EventType.ROOM_TYPE_SELECTED, EventType.ROOM_RATE_SELECTED],
  'Booking Initiated': [EventType.ROOM_BOOKING_INITIATED],
  'Payment Started': [EventType.PAYMENT_METHOD_SELECTED],
  'Details Completed': [EventType.PAYMENT_DETAILS_COMPLETED, EventType.GUEST_DETAILS_COMPLETED],
  'Reservation Confirmed': [EventType.RESERVATION_CONFIRMED]
};

interface ConversionFunnelProps {
  events: AnalyticsEvent[];
  loading?: boolean;
  height?: number;
}

interface MicroFunnelProps {
  events: AnalyticsEvent[];
  selectedStage: string;
  onClose: () => void;
}

export const MicroFunnelAnalysis: React.FC<MicroFunnelProps> = ({ 
  events, 
  selectedStage, 
  onClose 
}) => {
  const stageEvents = STAGE_EVENT_MAPPING[selectedStage as keyof typeof STAGE_EVENT_MAPPING] || [];
  
  const microSteps = useMemo(() => {
    return stageEvents.map(eventType => {
      const eventCount = events.filter(e => e.eventType === eventType).length;
      const metadata = EVENT_METADATA[eventType];
      
      return {
        eventType,
        label: metadata?.label || eventType,
        count: eventCount,
        color: metadata?.color || '#757575',
        importance: metadata?.importance || 'medium'
      };
    }).sort((a, b) => b.count - a.count);
  }, [events, stageEvents]);

  const totalStageEvents = microSteps.reduce((sum, step) => sum + step.count, 0);

  return (
    <Card sx={{ mt: 2, border: 2, borderColor: 'primary.main' }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Micro-Analysis: {selectedStage}
          </Typography>
          <IconButton size="small" onClick={onClose}>
            <ExpandLessRounded />
          </IconButton>
        </Stack>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Breakdown of {totalStageEvents.toLocaleString()} events in this funnel stage
        </Typography>
        
        <Grid container spacing={2}>
          {microSteps.map(step => (
            <Grid item xs={12} sm={6} md={4} key={step.eventType}>
              <Box sx={{ 
                p: 2, 
                border: 1, 
                borderColor: 'divider', 
                borderRadius: 2,
                textAlign: 'center',
                position: 'relative'
              }}>
                <Box
                  sx={{
                    width: 50,
                    height: 50,
                    borderRadius: '50%',
                    backgroundColor: step.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 1,
                    color: 'white',
                    fontWeight: 600,
                    fontSize: '1.1rem'
                  }}
                >
                  {step.count}
                </Box>
                <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>
                  {step.label}
                </Typography>
                <Chip 
                  label={step.importance} 
                  size="small" 
                  color={step.importance === 'critical' ? 'error' : 'default'}
                />
                
                {/* Percentage bar */}
                <Box sx={{ mt: 1 }}>
                  <LinearProgress
                    variant="determinate"
                    value={totalStageEvents > 0 ? (step.count / totalStageEvents) * 100 : 0}
                    sx={{
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: 'grey.200',
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: step.color,
                        borderRadius: 3
                      }
                    }}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                    {totalStageEvents > 0 ? ((step.count / totalStageEvents) * 100).toFixed(1) : '0'}% of stage
                  </Typography>
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  );
};

export const ConversionFunnel: React.FC<ConversionFunnelProps> = ({
  events,
  loading = false,
  height = 400
}) => {
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'standard' | 'detailed'>('standard');

  const funnelData = useMemo(() => {
    if (!events || events.length === 0) return [];

    // Calculate sessions that reached each stage
    const sessionsByStage = ENHANCED_FUNNEL_STAGES.map((stageName) => {
      const stageEvents = STAGE_EVENT_MAPPING[stageName];
      const uniqueSessions = new Set<string>();

      events.forEach(event => {
        if (stageEvents.includes(event.eventType as EventType)) {
          uniqueSessions.add(event.sessionId);
        }
      });

      return {
        name: stageName,
        count: uniqueSessions.size,
        percentage: 0, // Will be calculated below
        dropOff: 0,
        eventCount: events.filter(e => stageEvents.includes(e.eventType as EventType)).length
      };
    });

    // Calculate percentages and drop-off rates
    const totalSessions = sessionsByStage[0]?.count || 1;
    sessionsByStage.forEach((stage, index) => {
      stage.percentage = (stage.count / totalSessions) * 100;
      if (index > 0) {
        const previousCount = sessionsByStage[index - 1].count;
        stage.dropOff = previousCount > 0 ? ((previousCount - stage.count) / previousCount) * 100 : 0;
      }
    });

    return sessionsByStage;
  }, [events]);

  const conversionRate = useMemo(() => {
    if (funnelData.length === 0) return 0;
    const firstStage = funnelData[0];
    const lastStage = funnelData[funnelData.length - 1];
    return firstStage.count > 0 ? (lastStage.count / firstStage.count) * 100 : 0;
  }, [funnelData]);

  const biggestDropOff = useMemo(() => {
    return funnelData.reduce((max, stage) => 
      stage.dropOff > max.dropOff ? stage : max, 
      { name: '', dropOff: 0 }
    );
  }, [funnelData]);

  const handleStageClick = (stageName: string) => {
    setSelectedStage(selectedStage === stageName ? null : stageName);
  };

  return (
    <Box>
      {/* Main Funnel Chart */}
      <Card>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Enhanced Conversion Funnel
              </Typography>
              <Typography variant="body2" color="text.secondary">
                User journey through 28 canonical events • {events.length.toLocaleString()} total events
              </Typography>
            </Box>
            
            <ButtonGroup size="small" variant="outlined">
              <Button
                variant={viewMode === 'standard' ? 'contained' : 'outlined'}
                onClick={() => setViewMode('standard')}
              >
                Standard
              </Button>
              <Button
                variant={viewMode === 'detailed' ? 'contained' : 'outlined'}
                onClick={() => setViewMode('detailed')}
              >
                Detailed
              </Button>
            </ButtonGroup>
          </Stack>

          {/* Key Metrics */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={4}>
              <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'primary.light', borderRadius: 2 }}>
                <Typography variant="h4" sx={{ fontWeight: 600, color: 'primary.main' }}>
                  {conversionRate.toFixed(1)}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Overall Conversion Rate
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'error.light', borderRadius: 2 }}>
                <Stack direction="row" alignItems="center" justifyContent="center" gap={1}>
                  <TrendingDownRounded sx={{ color: 'error.main' }} />
                  <Typography variant="h4" sx={{ fontWeight: 600, color: 'error.main' }}>
                    {biggestDropOff.dropOff.toFixed(1)}%
                  </Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  Biggest Drop-off: {biggestDropOff.name}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'success.light', borderRadius: 2 }}>
                <Stack direction="row" alignItems="center" justifyContent="center" gap={1}>
                  <TrendingUpRounded sx={{ color: 'success.main' }} />
                  <Typography variant="h4" sx={{ fontWeight: 600, color: 'success.main' }}>
                    {funnelData[funnelData.length - 1]?.count.toLocaleString() || '0'}
                  </Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  Successful Conversions
                </Typography>
              </Box>
            </Grid>
          </Grid>

          {/* Funnel Visualization */}
          {funnelData.length > 0 && (
            <FunnelChart 
              stages={funnelData}
              loading={loading}
              height={height}
              title=""
            />
          )}

          {/* Interactive Stage Details */}
          {viewMode === 'detailed' && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                Stage Details - Click for Micro-Analysis
              </Typography>
              
              <Grid container spacing={1}>
                {funnelData.map((stage, index) => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={stage.name}>
                    <Box
                      sx={{
                        p: 2,
                        border: 1,
                        borderColor: selectedStage === stage.name ? 'primary.main' : 'divider',
                        borderRadius: 1,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        '&:hover': {
                          boxShadow: 2,
                          borderColor: 'primary.main'
                        }
                      }}
                      onClick={() => handleStageClick(stage.name)}
                    >
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {stage.name}
                        </Typography>
                        {selectedStage === stage.name ? <ExpandLessRounded /> : <ExpandMoreRounded />}
                      </Stack>
                      
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                        {stage.count.toLocaleString()}
                      </Typography>
                      
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="caption" color="success.main">
                          {stage.percentage.toFixed(1)}% reach
                        </Typography>
                        {index > 0 && stage.dropOff > 0 && (
                          <Typography variant="caption" color="error.main">
                            {stage.dropOff.toFixed(1)}% drop
                          </Typography>
                        )}
                      </Stack>
                      
                      <Tooltip title={`${stage.eventCount} total events in this stage`}>
                        <Chip 
                          label={`${stage.eventCount} events`} 
                          size="small" 
                          sx={{ mt: 1, fontSize: '0.7rem' }}
                        />
                      </Tooltip>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Micro-Funnel Analysis */}
      {selectedStage && (
        <MicroFunnelAnalysis
          events={events}
          selectedStage={selectedStage}
          onClose={() => setSelectedStage(null)}
        />
      )}
    </Box>
  );
};