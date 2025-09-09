import React, { useState } from 'react';
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
import { format } from 'date-fns';

interface SessionRecordsTableProps {
  sessions: Session[];
  loading?: boolean;
  onSessionClick?: (session: Session) => void;
  title?: string;
}

export const SessionRecordsTable: React.FC<SessionRecordsTableProps> = ({
  sessions,
  loading = false,
  onSessionClick,
  title = "Session Records"
}) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');

  // Filter sessions based on search term
  const filteredSessions = sessions.filter(session => 
    session.destination.toLowerCase().includes(searchTerm.toLowerCase()) ||
    session.hotel.toLowerCase().includes(searchTerm.toLowerCase()) ||
    session.sessionId.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
    const start = new Date(createdAt);
    const end = new Date(updatedAt);
    const durationMs = end.getTime() - start.getTime();
    const minutes = Math.floor(durationMs / (1000 * 60));
    const seconds = Math.floor((durationMs % (1000 * 60)) / 1000);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  const paginatedSessions = filteredSessions.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6">
            {title}
          </Typography>
          <TextField
            size="small"
            placeholder="Search sessions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ minWidth: 250 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Session ID</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Destination</TableCell>
                    <TableCell>Hotel</TableCell>
                    <TableCell>Duration</TableCell>
                    <TableCell>Stage</TableCell>
                    <TableCell>Updated</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedSessions.map((session) => (
                    <TableRow 
                      key={session.sessionId}
                      hover
                      sx={{ 
                        '&:hover': { 
                          cursor: onSessionClick ? 'pointer' : 'default' 
                        } 
                      }}
                      onClick={() => onSessionClick?.(session)}
                    >
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Person fontSize="small" color="action" />
                          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                            {session.sessionId.slice(0, 8)}...
                          </Typography>
                        </Box>
                      </TableCell>
                      
                      <TableCell>
                        <Chip
                          icon={getStatusIcon(session.status)}
                          label={session.status.replace('_', ' ')}
                          color={getStatusColor(session.status)}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LocationOn fontSize="small" color="action" />
                          <Typography variant="body2">
                            {session.destination}
                          </Typography>
                        </Box>
                      </TableCell>
                      
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <HotelIcon fontSize="small" color="action" />
                          <Typography variant="body2" noWrap sx={{ maxWidth: 120 }}>
                            {session.hotel}
                          </Typography>
                        </Box>
                      </TableCell>
                      
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <AccessTime fontSize="small" color="action" />
                          <Typography variant="body2">
                            {formatDuration(session.createdAt, session.updatedAt)}
                          </Typography>
                        </Box>
                      </TableCell>
                      
                      <TableCell>
                        <Chip
                          label={`Stage ${session.currentStage}`}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      </TableCell>
                      
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {format(new Date(session.updatedAt), 'HH:mm:ss')}
                        </Typography>
                      </TableCell>
                      
                      <TableCell align="right">
                        <Tooltip title="View Details">
                          <IconButton 
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSessionClick?.(session);
                            }}
                          >
                            <Visibility fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              rowsPerPageOptions={[5, 10, 25, 50]}
              component="div"
              count={filteredSessions.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
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