import React, { useState, useEffect, useRef } from 'react';
import {
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Chip,
  Box,
  IconButton,
  Badge,
  Divider,
  LinearProgress,
  Fade,
  Tooltip,
} from '@mui/material';
import {
  FiberManualRecord,
  Search,
  Hotel,
  CheckCircle,
  Cancel,
  TrendingUp,
  AccessTime,
  Person,
  Event as EventIcon,
  PlayArrow,
  Pause,
  Refresh,
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { Event, EventType, Session } from '../types';
import { useRealtimeWebSocket } from '../hooks/useRealtimeWebSocket';
import { useRealtimeMetrics } from '../hooks/useEventsApi';
import { safeObject, getMetricsValue } from '../utils/typeGuards';

interface ActivityItem {
  id: string;
  timestamp: string;
  type: 'session' | 'event' | 'booking' | 'metric';
  title: string;
  description: string;
  icon: React.ReactNode;
  color: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  metadata?: Record<string, any>;
}

interface LiveActivityFeedProps {
  propertyId?: string;
  maxItems?: number;
  showMetrics?: boolean;
  autoScroll?: boolean;
}

export const LiveActivityFeed: React.FC<LiveActivityFeedProps> = ({
  propertyId,
  maxItems = 50,
  showMetrics = true,
  autoScroll = true,
}) => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  // Real-time metrics
  const { data: metricsResponse } = useRealtimeMetrics(propertyId);
  const metrics = safeObject(metricsResponse);

  // WebSocket connection
  const { isConnected } = useRealtimeWebSocket({
    propertyId,
    onSessionUpdate: (session: Session) => {
      if (isPaused) return;
      
      const activity: ActivityItem = {
        id: `session-${session.sessionId}-${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'session',
        title: getSessionTitle(session),
        description: getSessionDescription(session),
        icon: getSessionIcon(session.status),
        color: getSessionColor(session.status),
        metadata: { session },
      };
      
      addActivity(activity);
    },
    onNewEvent: (event: Event, sessionId: string) => {
      if (isPaused) return;
      
      const activity: ActivityItem = {
        id: `event-${event.id}-${Date.now()}`,
        timestamp: event.timestamp,
        type: getActivityType(event.type as EventType),
        title: getEventTitle(event.type as EventType),
        description: getEventDescription(event),
        icon: getEventIcon(event.type as EventType),
        color: getEventColor(event.type as EventType),
        metadata: { event, sessionId },
      };
      
      addActivity(activity);
    },
  });

  const addActivity = (activity: ActivityItem) => {
    setActivities(prev => {
      const updated = [activity, ...prev];
      return updated.slice(0, maxItems);
    });
  };

  // Auto-scroll to top when new activities arrive
  useEffect(() => {
    if (autoScroll && !isPaused && listRef.current) {
      listRef.current.scrollTop = 0;
    }
  }, [activities, autoScroll, isPaused]);

  const handleRefresh = () => {
    setActivities([]);
  };

  const togglePause = () => {
    setIsPaused(prev => !prev);
  };

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ pb: 0 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6">Live Activity</Typography>
            <Badge 
              color={isConnected ? 'success' : 'error'}
              variant="dot"
              sx={{ '& .MuiBadge-badge': { right: -3, top: 10 } }}
            >
              <Chip
                size="small"
                label={activities.length}
                color="primary"
                variant="outlined"
              />
            </Badge>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title={isPaused ? 'Resume' : 'Pause'}>
              <IconButton size="small" onClick={togglePause}>
                {isPaused ? <PlayArrow /> : <Pause />}
              </IconButton>
            </Tooltip>
            <Tooltip title="Clear">
              <IconButton size="small" onClick={handleRefresh}>
                <Refresh />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {showMetrics && metrics && (
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <Chip
              icon={<Person />}
              label={`${getMetricsValue(metrics, 'activeSessions', 0)} active`}
              size="small"
              color="success"
              variant="outlined"
            />
            <Chip
              icon={<AccessTime />}
              label={`${getMetricsValue(metrics, 'sessionsLastHour', 0)} /hr`}
              size="small"
              variant="outlined"
            />
            <Chip
              icon={<TrendingUp />}
              label={`${getMetricsValue(metrics, 'eventsLastMinute', 0)} events/min`}
              size="small"
              variant="outlined"
            />
          </Box>
        )}

        {!isConnected && (
          <LinearProgress color="warning" sx={{ mb: 2 }} />
        )}
      </CardContent>

      <Divider />

      <Box 
        ref={listRef}
        sx={{ 
          flexGrow: 1, 
          overflow: 'auto',
          px: 2,
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: 'background.paper',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'divider',
            borderRadius: '4px',
          },
        }}
      >
        <List>
          {activities.map((activity, index) => (
            <Fade in key={activity.id}>
              <div>
                <ListItem 
                  alignItems="flex-start"
                  sx={{ 
                    px: 0,
                    '&:hover': { backgroundColor: 'action.hover' },
                  }}
                >
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: `${activity.color}.light` }}>
                      {activity.icon}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2" fontWeight="medium">
                          {activity.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <Typography variant="body2" color="text.secondary">
                        {activity.description}
                      </Typography>
                    }
                  />
                </ListItem>
                {index < activities.length - 1 && <Divider variant="inset" component="li" />}
              </div>
            </Fade>
          ))}
        </List>

        {activities.length === 0 && (
          <Box sx={{ 
            textAlign: 'center', 
            py: 4,
            color: 'text.secondary'
          }}>
            <Typography variant="body2">
              {isPaused ? 'Activity feed paused' : 'Waiting for activity...'}
            </Typography>
          </Box>
        )}
      </Box>
    </Card>
  );
};

// Helper functions
function getSessionTitle(session: Session): string {
  switch (session.status) {
    case 'LIVE':
      return 'Active Session';
    case 'DORMANT':
      return 'Session Idle';
    case 'CONFIRMED_BOOKING':
      return 'Booking Confirmed';
    case 'ABANDONED':
      return 'Session Abandoned';
    default:
      return 'Session Update';
  }
}

function getSessionDescription(session: Session): string {
  return `${session.destination || 'Unknown'} - ${session.hotel || 'Searching'} (Stage ${session.currentStage})`;
}

function getSessionIcon(status: string): React.ReactNode {
  switch (status) {
    case 'LIVE':
      return <Person />;
    case 'CONFIRMED_BOOKING':
      return <CheckCircle />;
    case 'ABANDONED':
      return <Cancel />;
    default:
      return <FiberManualRecord />;
  }
}

function getSessionColor(status: string): any {
  switch (status) {
    case 'LIVE':
      return 'success';
    case 'DORMANT':
      return 'warning';
    case 'CONFIRMED_BOOKING':
      return 'primary';
    case 'ABANDONED':
      return 'error';
    default:
      return 'info';
  }
}

function getActivityType(eventType: EventType): 'session' | 'event' | 'booking' | 'metric' {
  if (eventType === EventType.BOOKING_CONFIRMED || eventType === EventType.BOOKING_COMPLETED) {
    return 'booking';
  }
  return 'event';
}

function getEventTitle(eventType: EventType): string {
  switch (eventType) {
    case EventType.WIDGET_INITIALIZED:
      return 'Widget Loaded';
    case EventType.BOOKING_ENGINE_OPENED:
      return 'Booking Started';
    case EventType.SEARCH_PERFORMED:
      return 'Search Performed';
    case EventType.HOTEL_SELECTED:
      return 'Hotel Selected';
    case EventType.ROOM_SELECTED:
      return 'Room Selected';
    case EventType.BOOKING_CONFIRMED:
      return '🎉 Booking Confirmed';
    default:
      return eventType.replace(/_/g, ' ').toLowerCase();
  }
}

function getEventDescription(event: Event): string {
  
  switch (event.type as EventType) {
    case EventType.SEARCH_PERFORMED:
      return `Searching ${getMetricsValue(event.data, 'destination', 'hotels')}`;
    case EventType.HOTEL_SELECTED:
      return getMetricsValue(event.data, 'hotelName', 'Hotel selected');
    case EventType.ROOM_SELECTED:
      return getMetricsValue(event.data, 'roomType', 'Room selected');
    default:
      return getMetricsValue(event.data, 'description', '');
  }
}

function getEventIcon(eventType: EventType): React.ReactNode {
  switch (eventType) {
    case EventType.SEARCH_PERFORMED:
      return <Search />;
    case EventType.HOTEL_SELECTED:
      return <Hotel />;
    case EventType.BOOKING_CONFIRMED:
      return <CheckCircle />;
    default:
      return <EventIcon />;
  }
}

function getEventColor(eventType: EventType): any {
  if (eventType === EventType.BOOKING_CONFIRMED) {
    return 'success';
  }
  if (eventType.includes('ERROR')) {
    return 'error';
  }
  return 'info';
}