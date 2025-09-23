import React, { useMemo, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tooltip,
  Stack,
  Chip,
  IconButton,
  Collapse,
  Avatar,
  Divider,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Alert,
} from '@mui/material';
import {
  Timeline,
  TimelineItem,
  TimelineContent,
  TimelineDot,
  TimelineSeparator,
  TimelineConnector,
} from '@mui/lab';
import {
  ExpandMoreRounded,
  ExpandLessRounded,
  TimelineRounded,
  PersonRounded,
  CheckCircleRounded,
  ErrorRounded,
  WarningRounded,
  InfoRounded,
  LaunchRounded,
} from '@mui/icons-material';
import { format, formatDistanceToNow } from 'date-fns';
import { AnalyticsEvent, EventType, EVENT_METADATA } from '../types';

interface UserJourneyProps {
  sessionId: string;
  events: AnalyticsEvent[];
  compact?: boolean;
  maxEvents?: number;
}

interface JourneyEvent extends AnalyticsEvent {
  metadata: {
    label: string;
    icon: string;
    color: string;
    importance: 'low' | 'medium' | 'high' | 'critical';
    category: string;
    description: string;
  };
}

export const UserJourney: React.FC<UserJourneyProps> = ({ 
  sessionId, 
  events, 
  compact = false, 
  maxEvents = 20 
}) => {
  const [expanded, setExpanded] = useState(!compact);
  const [selectedEvent, setSelectedEvent] = useState<JourneyEvent | null>(null);

  const journeyEvents = useMemo(() => {
    const sessionEvents = events
      .filter(e => e.sessionId === sessionId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .map(event => {
        const eventType = event.eventType as EventType;
        const metadata = EVENT_METADATA[eventType] || {
          label: event.eventType,
          icon: 'help_outline',
          color: '#757575',
          importance: 'medium' as const,
          category: 'uncategorized',
          description: 'Unknown event type'
        };
        
        return {
          ...event,
          metadata
        } as JourneyEvent;
      });

    return compact ? sessionEvents.slice(0, maxEvents) : sessionEvents;
  }, [sessionId, events, compact, maxEvents]);

  const journeyStats = useMemo(() => {
    if (journeyEvents.length === 0) return null;

    const startTime = new Date(journeyEvents[0].timestamp).getTime();
    const endTime = new Date(journeyEvents[journeyEvents.length - 1].timestamp).getTime();
    const totalDuration = endTime - startTime;
    
    const categories = journeyEvents.reduce((acc, event) => {
      const category = event.metadata.category;
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const hasConversion = journeyEvents.some(e => e.eventType === EventType.RESERVATION_CONFIRMED);
    const hasDropoff = journeyEvents.some(e => e.eventType === EventType.BOOKING_ENGINE_EXITED);
    
    const criticalEvents = journeyEvents.filter(e => e.metadata.importance === 'critical');
    
    return {
      totalEvents: journeyEvents.length,
      duration: totalDuration,
      durationText: formatDistanceToNow(new Date(startTime), { addSuffix: false }),
      categories,
      hasConversion,
      hasDropoff,
      criticalEvents: criticalEvents.length,
      status: hasConversion ? 'converted' : hasDropoff ? 'dropped' : 'active'
    };
  }, [journeyEvents]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'converted': return 'success.main';
      case 'dropped': return 'error.main';
      case 'active': return 'info.main';
      default: return 'grey.500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'converted': return <CheckCircleRounded />;
      case 'dropped': return <ErrorRounded />;
      case 'active': return <TimelineRounded />;
      default: return <InfoRounded />;
    }
  };

  const getEventIcon = (iconName: string) => {
    // Map icon names to MUI icons
    const iconMap: Record<string, React.ReactNode> = {
      'power_settings_new': <PersonRounded />,
      'open_in_browser': <LaunchRounded />,
      'search': <TimelineRounded />,
      'hotel': <PersonRounded />,
      'check_circle': <CheckCircleRounded />,
      // Add more mappings as needed
    };
    
    return iconMap[iconName] || <InfoRounded />;
  };

  if (!journeyStats || journeyEvents.length === 0) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" color="text.secondary">
            No journey data for session {sessionId.slice(-8)}
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card sx={{ minWidth: compact ? 300 : 400 }}>
        <CardContent>
          {/* Journey Header */}
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Box>
              <Stack direction="row" alignItems="center" gap={1}>
                <Avatar sx={{ width: 32, height: 32, bgcolor: getStatusColor(journeyStats.status) }}>
                  {getStatusIcon(journeyStats.status)}
                </Avatar>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Session {sessionId.slice(-8)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {journeyStats.totalEvents} events • {journeyStats.durationText}
                  </Typography>
                </Box>
              </Stack>
            </Box>
            
            {compact && (
              <IconButton size="small" onClick={() => setExpanded(!expanded)}>
                {expanded ? <ExpandLessRounded /> : <ExpandMoreRounded />}
              </IconButton>
            )}
          </Stack>

          {/* Journey Status */}
          <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap">
            <Chip
              label={journeyStats.status.toUpperCase()}
              color={journeyStats.status === 'converted' ? 'success' : 
                     journeyStats.status === 'dropped' ? 'error' : 'info'}
              size="small"
            />
            {journeyStats.criticalEvents > 0 && (
              <Chip
                label={`${journeyStats.criticalEvents} critical events`}
                color="warning"
                size="small"
              />
            )}
            <Chip
              label={`${Object.keys(journeyStats.categories).length} categories`}
              variant="outlined"
              size="small"
            />
          </Stack>

          <Collapse in={expanded}>
            {/* Timeline */}
            <Timeline position="left">
              {journeyEvents.map((event, index) => (
                <TimelineItem key={event.eventId}>
                  <TimelineSeparator>
                    <Tooltip title={`${event.metadata.label} - ${event.metadata.description}`}>
                      <TimelineDot 
                        sx={{ 
                          bgcolor: event.metadata.color,
                          border: event.metadata.importance === 'critical' ? 3 : 1,
                          borderColor: event.metadata.importance === 'critical' ? 'warning.main' : 'grey.300',
                          cursor: 'pointer',
                          '&:hover': { transform: 'scale(1.2)' },
                          transition: 'transform 0.2s'
                        }}
                        onClick={() => setSelectedEvent(event)}
                      >
                        {getEventIcon(event.metadata.icon)}
                      </TimelineDot>
                    </Tooltip>
                    {index < journeyEvents.length - 1 && (
                      <TimelineConnector sx={{ 
                        bgcolor: index < journeyEvents.length - 1 ? 'primary.light' : 'grey.300',
                        minHeight: compact ? 20 : 30 
                      }} />
                    )}
                  </TimelineSeparator>
                  <TimelineContent>
                    <Box 
                      sx={{ 
                        cursor: 'pointer',
                        '&:hover': { bgcolor: 'action.hover' },
                        p: 1,
                        borderRadius: 1
                      }}
                      onClick={() => setSelectedEvent(event)}
                    >
                      <Typography variant="body2" sx={{ 
                        fontWeight: event.metadata.importance === 'critical' ? 600 : 400 
                      }}>
                        {event.metadata.label}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {format(new Date(event.timestamp), 'HH:mm:ss')}
                      </Typography>
                      {event.data && Object.keys(event.data).length > 0 && !compact && (
                        <Box sx={{ mt: 0.5 }}>
                          <Typography variant="caption" sx={{ 
                            backgroundColor: 'grey.100', 
                            px: 1, 
                            py: 0.5, 
                            borderRadius: 1,
                            display: 'inline-block',
                            maxWidth: '200px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {JSON.stringify(event.data).slice(0, 50)}...
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </TimelineContent>
                </TimelineItem>
              ))}
            </Timeline>

            {/* Category Breakdown */}
            {!compact && (
              <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                  Event Categories
                </Typography>
                <Stack direction="row" flexWrap="wrap" gap={1}>
                  {Object.entries(journeyStats.categories).map(([category, count]) => (
                    <Chip
                      key={category}
                      label={`${category.replace('_', ' ')} (${count})`}
                      size="small"
                      variant="outlined"
                    />
                  ))}
                </Stack>
              </Box>
            )}
          </Collapse>
        </CardContent>
      </Card>

      {/* Event Details Dialog */}
      <Dialog
        open={Boolean(selectedEvent)}
        onClose={() => setSelectedEvent(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                backgroundColor: selectedEvent?.metadata.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white'
              }}
            >
              {selectedEvent && getEventIcon(selectedEvent.metadata.icon)}
            </Box>
            <Box>
              <Typography variant="h6">
                {selectedEvent?.metadata.label}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {selectedEvent?.metadata.description}
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          {selectedEvent && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  Event Information
                </Typography>
                <Stack spacing={1}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Event Type:</Typography>
                    <Typography variant="body2">{selectedEvent.eventType}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Category:</Typography>
                    <Chip label={selectedEvent.metadata.category} size="small" />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Importance:</Typography>
                    <Chip 
                      label={selectedEvent.metadata.importance} 
                      size="small" 
                      color={selectedEvent.metadata.importance === 'critical' ? 'error' : 'default'}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Timestamp:</Typography>
                    <Typography variant="body2">
                      {format(new Date(selectedEvent.timestamp), 'MMM dd, yyyy HH:mm:ss')}
                    </Typography>
                  </Box>
                </Stack>
              </Grid>

              <Grid item xs={12} md={6}>
                {selectedEvent.data && Object.keys(selectedEvent.data).length > 0 && (
                  <>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                      Event Data
                    </Typography>
                    <Box sx={{ 
                      p: 2, 
                      bgcolor: 'grey.50', 
                      borderRadius: 1,
                      maxHeight: 200,
                      overflow: 'auto'
                    }}>
                      <pre style={{ 
                        whiteSpace: 'pre-wrap', 
                        fontSize: '0.875rem',
                        margin: 0,
                        fontFamily: 'monospace',
                      }}>
                        {JSON.stringify(selectedEvent.data, null, 2)}
                      </pre>
                    </Box>
                  </>
                )}
              </Grid>
            </Grid>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setSelectedEvent(null)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};