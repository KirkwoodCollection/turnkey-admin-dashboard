import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Box,
  TablePagination,
  IconButton,
  Tooltip,
  CircularProgress,
  TextField,
  InputAdornment,
} from '@mui/material';
import {
  Search,
  Visibility,
  FiberManualRecord,
  AccessTime,
  Person,
  LocationOn,
  Hotel as HotelIcon,
} from '@mui/icons-material';
import { Session, SESSION_STATUS_COLORS } from '../types';
import { safeArray, safeObject } from '../utils/typeGuards';
import { format } from 'date-fns';
import { useRealtimeWebSocket } from '../hooks/useRealtimeWebSocket';
import { useActiveSessions } from '../hooks/useEventsApi';
import { useAnalyticsSessions } from '../hooks/useAnalyticsData';
import { TimeRange } from '../services/analyticsApi';

interface SessionRecordsTableProps {
  sessions?: Session[];
  loading?: boolean;
  onSessionClick?: (session: Session) => void;
  title?: string;
  subtitle?: string;
  useRealtime?: boolean;
  useAnalytics?: boolean;
  timeRange?: TimeRange;
  propertyId?: string;
}

export const SessionRecordsTable: React.FC<SessionRecordsTableProps> = ({
  sessions: propSessions,
  loading: propLoading = false,
  onSessionClick,
  title = "Session Records",
  subtitle,
  useRealtime = false,
  useAnalytics = false,
  timeRange = '24h',
  propertyId
}) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [localSessions, setLocalSessions] = useState<Session[]>([]);

  // Fetch real-time sessions if enabled
  const { data: realtimeSessions, isLoading: realtimeLoading } = useActiveSessions(
    useRealtime ? propertyId : undefined
  );

  // Fetch Analytics sessions if enabled
  const { data: analyticsData, isLoading: analyticsLoading } = useAnalyticsSessions(
    useAnalytics ? timeRange : '24h',
    rowsPerPage,
    page * rowsPerPage,
    useAnalytics ? propertyId : undefined
  );

  // WebSocket connection for real-time updates
  const { isConnected } = useRealtimeWebSocket({
    propertyId,
    onSessionUpdate: useRealtime ? (updatedSession) => {
      setLocalSessions(prev => {
        const index = prev.findIndex(s => s.sessionId === updatedSession.sessionId);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = updatedSession;
          return updated;
        } else {
          // New session, add to beginning
          return [updatedSession, ...prev];
        }
      });
    } : undefined,
  });

  // Determine which sessions to display
  const sessions = useMemo((): Session[] => {
    if (useAnalytics && analyticsData) {
      const safeData = safeObject(analyticsData);
      return safeArray<Session>(safeData.sessions);
    }
    if (useRealtime && realtimeSessions) {
      return localSessions.length > 0 ? localSessions : safeArray<Session>(realtimeSessions);
    }
    return safeArray<Session>(propSessions);
  }, [useAnalytics, analyticsData, useRealtime, realtimeSessions, localSessions, propSessions]);

  const loading = useAnalytics ? analyticsLoading : (useRealtime ? realtimeLoading : propLoading);

  // Update local sessions when real-time data changes
  useEffect(() => {
    if (useRealtime && realtimeSessions) {
      setLocalSessions(safeArray<Session>(realtimeSessions));
    }
  }, [useRealtime, realtimeSessions]);

  // Filter sessions based on search term - ensure safe filtering
  const filteredSessions = (sessions || []).filter((session) => {
    if (!session) return false;
    const searchLower = (searchTerm || '').toLowerCase();
    return (
      (session.destination || '').toLowerCase().includes(searchLower) ||
      (session.hotel || '').toLowerCase().includes(searchLower) ||
      (session.sessionId || '').toLowerCase().includes(searchLower)
    );
  });

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getStatusColor = (status: string): 'success' | 'warning' | 'info' | 'error' => {
    switch (status) {
      case 'LIVE': return 'success';
      case 'DORMANT': return 'warning';
      case 'CONFIRMED_BOOKING': return 'info';
      case 'ABANDONED': return 'error';
      default: return 'info';
    }
  };

  const getStatusIcon = (status: string) => (
    <FiberManualRecord 
      sx={{ 
        fontSize: 12, 
        color: SESSION_STATUS_COLORS[status as keyof typeof SESSION_STATUS_COLORS] || '#666',
        mr: 0.5 
      }} 
    />
  );

  const formatDuration = (createdAt: string, updatedAt: string): string => {
    if (!createdAt || !updatedAt) return '-';

    const start = new Date(createdAt);
    const end = new Date(updatedAt);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) return '-';

    const durationMs = end.getTime() - start.getTime();
    if (durationMs < 0) return '-';

    const minutes = Math.floor(durationMs / (1000 * 60));
    const seconds = Math.floor((durationMs % (1000 * 60)) / 1000);

    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  const getTagColor = (tag: string): string => {
    const tagColors: Record<string, string> = {
      'SEARCH ENGINE': '#1976d2',
      'PROSPECTING': '#9c27b0',
      'SEARCHING': '#2196f3',
      'FILTERING': '#00bcd4',
      'HE OPENED': '#4caf50',
      'BOOKING FORM': '#ff9800',
      'ABANDONED': '#f44336'
    };
    return tagColors[tag] || '#666666';
  };

  const paginatedSessions = filteredSessions.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  // Convert real sessions to display format
  const displaySessions = paginatedSessions.map(session => ({
    sessionId: session.sessionId ? session.sessionId.slice(0, 15) + '...' : 'Unknown',
    status: `Sessions:${session.status}`,
    selections: session.currentStage || 1,
    timestamp: session.updatedAt && !isNaN(new Date(session.updatedAt).getTime())
      ? format(new Date(session.updatedAt), 'MMM dd, yyyy, hh:mm a')
      : 'Unknown',
    tags: generateTagsFromSession(session),
    statusColor: getStatusColor(session.status) === 'success' ? '#28a745' :
                 getStatusColor(session.status) === 'error' ? '#dc3545' :
                 getStatusColor(session.status) === 'warning' ? '#ffc107' : '#17a2b8'
  }));

  function generateTagsFromSession(session: Session): string[] {
    const tags = ['SEARCH ENGINE'];

    if (session.destination) tags.push('DESTINATION SELECTED');
    if (session.hotel) tags.push('HOTEL SELECTED');
    if (session.currentStage && session.currentStage > 1) tags.push('SEARCHING');
    if (session.currentStage && session.currentStage > 2) tags.push('FILTERING');
    if (session.status === 'LIVE') tags.push('ACTIVE');
    if (session.status === 'CONFIRMED_BOOKING') tags.push('BOOKING FORM');
    if (session.status === 'ABANDONED') tags.push('ABANDONED');

    return tags;
  }

  return (
    <Card sx={{
      borderRadius: '4px',
      boxShadow: '0px 2px 1px -1px rgba(0,0,0,0.2), 0px 1px 1px 0px rgba(0,0,0,0.14), 0px 1px 3px 0px rgba(0,0,0,0.12)',
      bgcolor: '#ffffff'
    }}>
      <CardContent sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography sx={{
            fontWeight: 500,
            fontSize: '1.25rem',
            color: 'rgba(0, 0, 0, 0.87)',
            fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif'
          }}>
            {title}
          </Typography>
          <Box sx={{
            bgcolor: '#e3f2fd',
            color: '#1976d2',
            px: 1,
            py: 0.5,
            borderRadius: '4px',
            fontSize: '0.75rem',
            fontWeight: 500,
            cursor: 'pointer'
          }}>
            Force Refresh
          </Box>
        </Box>

        {subtitle && (
          <Typography sx={{
            color: 'rgba(0, 0, 0, 0.6)',
            mb: 2,
            fontSize: '0.875rem'
          }}>
            {subtitle}
          </Typography>
        )}

        <Typography sx={{
          mb: 2,
          color: 'rgba(0, 0, 0, 0.6)',
          fontSize: '0.875rem'
        }}>
          📊 <strong>Session Summary:</strong> {filteredSessions.length} total visits • <strong>{displaySessions.filter(s => s.selections > 1).length} with interactions</strong> • {displaySessions.filter(s => s.selections === 1).length} minimal activity
        </Typography>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {/* Session entries from real data */}
            <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
              {displaySessions.map((session, index) => (
                <Box
                  key={index}
                  sx={{
                    p: 1.5,
                    borderBottom: index < displaySessions.length - 1 ? '1px solid rgba(0, 0, 0, 0.12)' : 'none',
                    '&:hover': {
                      bgcolor: 'rgba(0, 0, 0, 0.04)',
                      cursor: 'pointer'
                    }
                  }}
                  onClick={() => onSessionClick?.(paginatedSessions[index])}
                >
                  {/* Main session info row */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Person sx={{ fontSize: 16, color: 'rgba(0, 0, 0, 0.6)' }} />
                    <Typography sx={{
                      fontFamily: 'monospace',
                      fontWeight: 400,
                      color: 'rgba(0, 0, 0, 0.87)',
                      fontSize: '0.875rem'
                    }}>
                      {session.sessionId}
                    </Typography>
                    <Typography sx={{
                      color: 'rgba(0, 0, 0, 0.6)',
                      fontSize: '0.75rem'
                    }}>
                      ▽ {session.selections} selections
                    </Typography>
                    <Box sx={{
                      bgcolor: session.statusColor,
                      color: 'white',
                      px: 1,
                      py: 0.25,
                      borderRadius: '12px',
                      fontSize: '0.65rem',
                      fontWeight: 600
                    }}>
                      {session.status.replace('Sessions:', '')}
                    </Box>
                    <Box sx={{ flex: 1 }} />
                    <Typography sx={{
                      color: 'rgba(0, 0, 0, 0.6)',
                      fontSize: '0.75rem'
                    }}>
                      {session.timestamp}
                    </Typography>
                  </Box>

                  {/* Journey flow visualization */}
                  <Box sx={{ ml: 2.5 }}>
                    <Typography sx={{
                      color: 'rgba(0, 0, 0, 0.6)',
                      fontSize: '0.75rem',
                      mb: 0.5
                    }}>
                      🛤️ Journey Flow:
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                      {session.tags.map((tag, tagIndex) => (
                        <React.Fragment key={tagIndex}>
                          <Box sx={{
                            bgcolor: getTagColor(tag),
                            color: 'white',
                            px: 0.75,
                            py: 0.25,
                            borderRadius: '12px',
                            fontSize: '0.65rem',
                            fontWeight: 500
                          }}>
                            {tag}
                          </Box>
                          {tagIndex < session.tags.length - 1 && (
                            <Typography sx={{
                              color: 'rgba(0, 0, 0, 0.6)',
                              fontSize: '0.7rem'
                            }}>
                              →
                            </Typography>
                          )}
                        </React.Fragment>
                      ))}
                    </Box>
                  </Box>
                </Box>
              ))}
            </Box>
          </>
        )}

        {!loading && filteredSessions.length === 0 && (
          <Box sx={{ 
            textAlign: 'center', 
            py: 4,
            color: 'text.secondary'
          }}>
            <Typography>
              {searchTerm ? 'No sessions match your search.' : 'No session data available.'}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};