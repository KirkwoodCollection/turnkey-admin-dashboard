import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  LinearProgress,
  Chip,
  Skeleton
} from '@mui/material';
import { TrendingUp, Place, Hotel } from '@mui/icons-material';

interface TopMetricsPanelsProps {
  topDestinations: Array<{
    destination: string;
    count: number;
    percentage: number;
  }>;
  topHotels: Array<{
    hotel: string;
    searches: number;
    bookings: number;
    conversionRate: number;
  }>;
  funnelStats: Array<{
    stage: string;
    count: number;
    percentage: number;
    dropOffRate: number;
  }>;
  loading?: boolean;
  panelType?: 'destinations' | 'hotels' | 'funnel';
}

const MetricCard: React.FC<{
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  loading?: boolean;
}> = ({ title, icon, children, loading }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 40,
          height: 40,
          borderRadius: '8px',
          bgcolor: 'primary.light',
          color: 'primary.contrastText',
          mr: 2
        }}>
          {icon}
        </Box>
        <Typography variant="h6" component="h3">
          {title}
        </Typography>
      </Box>
      {loading ? <Skeleton variant="rectangular" height={200} /> : children}
    </CardContent>
  </Card>
);

export const TopMetricsPanels: React.FC<TopMetricsPanelsProps> = ({
  topDestinations,
  topHotels,
  funnelStats,
  loading = false,
  panelType
}) => {
  // Format real data for display
  const displayDestinations = topDestinations.slice(0, 4).map((dest, index) => ({
    destination: `#${index + 1} ${dest.destination}`,
    count: dest.count,
    color: '#666'
  }));

  const displayHotels = topHotels.slice(0, 6).map((hotel, index) => ({
    hotel: `#${index + 1} ${hotel.hotel}`,
    count: hotel.searches || hotel.bookings || 0,
    color: '#e53e3e'
  }));

  const displayFunnelStats = funnelStats.map(stat => ({
    stage: stat.stage,
    count: stat.count,
    percentage: stat.percentage,
    color: '#1976d2'
  }));

  if (panelType === 'destinations') {
    return (
      <Card sx={{
        height: 500,
        borderRadius: '4px',
        boxShadow: '0px 2px 1px -1px rgba(0,0,0,0.2), 0px 1px 1px 0px rgba(0,0,0,0.14), 0px 1px 3px 0px rgba(0,0,0,0.12)',
        bgcolor: '#ffffff'
      }}>
        <CardContent sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Place sx={{ color: '#1976d2', mr: 1, fontSize: 18 }} />
            <Typography sx={{
              fontWeight: 500,
              fontSize: '1.25rem',
              color: 'rgba(0, 0, 0, 0.87)',
              fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif'
            }}>
              Top Destinations
            </Typography>
          </Box>
          <Typography sx={{
            color: 'rgba(0, 0, 0, 0.6)',
            mb: 2,
            fontSize: '0.875rem'
          }}>
            All markets • No matching required
          </Typography>

          <Box sx={{ flex: 1, overflow: 'auto', maxHeight: 400 }}>
            {displayDestinations.length > 0 ? (
              displayDestinations.map((item, index) => (
                <Box
                  key={index}
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    py: 1,
                    borderBottom: index < displayDestinations.length - 1 ? '1px solid rgba(0, 0, 0, 0.12)' : 'none'
                  }}
                >
                  <Typography sx={{
                    color: 'rgba(0, 0, 0, 0.87)',
                    fontSize: '0.875rem',
                    fontWeight: 400
                  }}>
                    {item.destination}
                  </Typography>
                  <Typography sx={{
                    fontWeight: 700,
                    color: 'rgba(0, 0, 0, 0.87)',
                    fontSize: '0.875rem'
                  }}>
                    {item.count}
                  </Typography>
                </Box>
              ))
            ) : (
              <Box sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: 'rgba(0, 0, 0, 0.6)'
              }}>
                <Typography sx={{ fontSize: '0.875rem' }}>
                  No destination data available
                </Typography>
              </Box>
            )}
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (panelType === 'hotels') {
    return (
      <Card sx={{
        height: 500,
        borderRadius: '4px',
        boxShadow: '0px 2px 1px -1px rgba(0,0,0,0.2), 0px 1px 1px 0px rgba(0,0,0,0.14), 0px 1px 3px 0px rgba(0,0,0,0.12)',
        bgcolor: '#ffffff'
      }}>
        <CardContent sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Hotel sx={{ color: '#dc004e', mr: 1, fontSize: 18 }} />
            <Typography sx={{
              fontWeight: 500,
              fontSize: '1.25rem',
              color: 'rgba(0, 0, 0, 0.87)',
              fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif'
            }}>
              Top Hotels
            </Typography>
          </Box>
          <Typography sx={{
            color: 'rgba(0, 0, 0, 0.6)',
            mb: 2,
            fontSize: '0.875rem'
          }}>
            Ranked by minimum volume • Scroll for more
          </Typography>

          <Box sx={{ flex: 1, overflow: 'auto', maxHeight: 400 }}>
            {displayHotels.length > 0 ? (
              displayHotels.map((item, index) => (
                <Box
                  key={index}
                  sx={{
                    py: 1,
                    borderBottom: index < displayHotels.length - 1 ? '1px solid rgba(0, 0, 0, 0.12)' : 'none'
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                    <Typography sx={{
                      color: 'rgba(0, 0, 0, 0.87)',
                      fontSize: '0.875rem',
                      fontWeight: 400,
                      flex: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      pr: 1
                    }}>
                      {item.hotel}
                    </Typography>
                    <Typography sx={{
                      fontWeight: 700,
                      color: '#dc004e',
                      fontSize: '0.875rem'
                    }}>
                      {item.count}
                    </Typography>
                  </Box>
                  <Typography sx={{
                    color: 'rgba(0, 0, 0, 0.6)',
                    fontSize: '0.75rem'
                  }}>
                    % of all selections
                  </Typography>
                </Box>
              ))
            ) : (
              <Box sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: 'rgba(0, 0, 0, 0.6)'
              }}>
                <Typography sx={{ fontSize: '0.875rem' }}>
                  No hotel data available
                </Typography>
              </Box>
            )}
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (panelType === 'funnel') {
    return (
      <Card sx={{
        height: 500,
        borderRadius: '4px',
        boxShadow: '0px 2px 1px -1px rgba(0,0,0,0.2), 0px 1px 1px 0px rgba(0,0,0,0.14), 0px 1px 3px 0px rgba(0,0,0,0.12)',
        bgcolor: '#ffffff'
      }}>
        <CardContent sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <TrendingUp sx={{ color: '#1976d2', mr: 1, fontSize: 18 }} />
            <Typography sx={{
              fontWeight: 500,
              fontSize: '1.25rem',
              color: 'rgba(0, 0, 0, 0.87)',
              fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif'
            }}>
              Funnel Stats
            </Typography>
          </Box>
          <Typography sx={{
            color: 'rgba(0, 0, 0, 0.6)',
            mb: 2,
            fontSize: '0.875rem'
          }}>
            Guest journey progression • Time period filtered
          </Typography>

          <Box sx={{ flex: 1, overflow: 'auto', maxHeight: 400 }}>
            {displayFunnelStats.length > 0 ? displayFunnelStats.map((item, index) => (
              <Box
                key={index}
                sx={{
                  mb: 2,
                  '&:last-child': {
                    mb: 0
                  }
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                  <Typography sx={{
                    color: 'rgba(0, 0, 0, 0.87)',
                    fontSize: '0.875rem',
                    fontWeight: 400
                  }}>
                    {item.stage}
                  </Typography>
                  <Typography sx={{
                    fontWeight: 700,
                    color: '#1976d2',
                    fontSize: '0.875rem'
                  }}>
                    {item.count}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography sx={{
                    color: 'rgba(0, 0, 0, 0.6)',
                    fontSize: '0.75rem'
                  }}>
                    % of all sessions
                  </Typography>
                  <Typography sx={{
                    color: 'rgba(0, 0, 0, 0.6)',
                    fontSize: '0.75rem'
                  }}>
                    {item.percentage}% completion
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={item.percentage}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    bgcolor: 'rgba(25, 118, 210, 0.1)',
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 4,
                      bgcolor: '#1976d2',
                    }
                  }}
                />
              </Box>
            )) : (
              <Box sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: 'rgba(0, 0, 0, 0.6)'
              }}>
                <Typography sx={{ fontSize: '0.875rem' }}>
                  No funnel data available
                </Typography>
              </Box>
            )}
          </Box>
        </CardContent>
      </Card>
    );
  }

  // Default: return empty box if no specific panel type
  return <Box />;
};