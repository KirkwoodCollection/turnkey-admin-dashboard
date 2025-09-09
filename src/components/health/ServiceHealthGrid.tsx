import React, { useState, useMemo } from 'react';
import {
  Box,
  Grid,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Typography,
  Chip,
  Alert,
  Skeleton,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import {
  SearchRounded,
  ViewModuleRounded,
  ViewListRounded,
  FilterListRounded,
} from '@mui/icons-material';
import { ServiceHealthCard } from './ServiceHealthCard';
import { ServiceHealthStatus, HEALTH_STATUS_COLORS } from '../../types';

interface ServiceHealthGridProps {
  services: ServiceHealthStatus[];
  isLoading?: boolean;
  error?: string | null;
  onServiceClick?: (serviceId: string) => void;
  onRefresh?: () => void;
}

type StatusFilter = 'all' | 'healthy' | 'degraded' | 'unhealthy';
type ViewMode = 'grid' | 'list';

export const ServiceHealthGrid: React.FC<ServiceHealthGridProps> = ({
  services,
  isLoading = false,
  error = null,
  onServiceClick,
  onRefresh,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [expandedServices, setExpandedServices] = useState<Set<string>>(new Set());

  const filteredServices = useMemo(() => {
    return services.filter((service) => {
      const matchesSearch = service.service_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || service.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [services, searchQuery, statusFilter]);

  const servicesByStatus = useMemo(() => {
    return services.reduce((acc, service) => {
      acc[service.status] = (acc[service.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [services]);

  const toggleServiceExpanded = (serviceName: string) => {
    setExpandedServices(prev => {
      const newSet = new Set(prev);
      if (newSet.has(serviceName)) {
        newSet.delete(serviceName);
      } else {
        newSet.add(serviceName);
      }
      return newSet;
    });
  };

  if (error) {
    return (
      <Alert 
        severity="error" 
        action={
          onRefresh && (
            <Chip 
              label="Retry" 
              clickable 
              onClick={onRefresh}
              size="small"
            />
          )
        }
      >
        Failed to load service health data: {error}
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header with filters and controls */}
      <Box sx={{ mb: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Service Health Status
          </Typography>
          
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_, newView) => newView && setViewMode(newView)}
            size="small"
          >
            <ToggleButton value="grid">
              <ViewModuleRounded fontSize="small" />
            </ToggleButton>
            <ToggleButton value="list">
              <ViewListRounded fontSize="small" />
            </ToggleButton>
          </ToggleButtonGroup>
        </Stack>

        {/* Status summary chips */}
        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
          <Chip
            label={`Total: ${services.length}`}
            variant={statusFilter === 'all' ? 'filled' : 'outlined'}
            onClick={() => setStatusFilter('all')}
            clickable
          />
          <Chip
            label={`Healthy: ${servicesByStatus.healthy || 0}`}
            variant={statusFilter === 'healthy' ? 'filled' : 'outlined'}
            onClick={() => setStatusFilter('healthy')}
            clickable
            sx={{
              bgcolor: statusFilter === 'healthy' ? HEALTH_STATUS_COLORS.healthy : 'transparent',
              borderColor: HEALTH_STATUS_COLORS.healthy,
              color: statusFilter === 'healthy' ? 'white' : HEALTH_STATUS_COLORS.healthy,
              '&:hover': {
                bgcolor: `${HEALTH_STATUS_COLORS.healthy}15`,
              }
            }}
          />
          <Chip
            label={`Degraded: ${servicesByStatus.degraded || 0}`}
            variant={statusFilter === 'degraded' ? 'filled' : 'outlined'}
            onClick={() => setStatusFilter('degraded')}
            clickable
            sx={{
              bgcolor: statusFilter === 'degraded' ? HEALTH_STATUS_COLORS.degraded : 'transparent',
              borderColor: HEALTH_STATUS_COLORS.degraded,
              color: statusFilter === 'degraded' ? 'white' : HEALTH_STATUS_COLORS.degraded,
              '&:hover': {
                bgcolor: `${HEALTH_STATUS_COLORS.degraded}15`,
              }
            }}
          />
          <Chip
            label={`Unhealthy: ${servicesByStatus.unhealthy || 0}`}
            variant={statusFilter === 'unhealthy' ? 'filled' : 'outlined'}
            onClick={() => setStatusFilter('unhealthy')}
            clickable
            sx={{
              bgcolor: statusFilter === 'unhealthy' ? HEALTH_STATUS_COLORS.unhealthy : 'transparent',
              borderColor: HEALTH_STATUS_COLORS.unhealthy,
              color: statusFilter === 'unhealthy' ? 'white' : HEALTH_STATUS_COLORS.unhealthy,
              '&:hover': {
                bgcolor: `${HEALTH_STATUS_COLORS.unhealthy}15`,
              }
            }}
          />
        </Stack>

        {/* Search and filter controls */}
        <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
          <TextField
            placeholder="Search services..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="small"
            sx={{ minWidth: 300 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRounded />
                </InputAdornment>
              ),
            }}
          />

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Status Filter</InputLabel>
            <Select
              value={statusFilter}
              label="Status Filter"
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              startAdornment={<FilterListRounded sx={{ mr: 1 }} />}
            >
              <MenuItem value="all">All Services</MenuItem>
              <MenuItem value="healthy">Healthy Only</MenuItem>
              <MenuItem value="degraded">Degraded Only</MenuItem>
              <MenuItem value="unhealthy">Unhealthy Only</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </Box>

      {/* Services grid/list */}
      {isLoading ? (
        <Grid container spacing={2}>
          {Array.from({ length: 12 }).map((_, index) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
              <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 1 }} />
            </Grid>
          ))}
        </Grid>
      ) : (
        <>
          {filteredServices.length === 0 ? (
            <Box 
              sx={{ 
                textAlign: 'center', 
                py: 4,
                color: 'text.secondary',
              }}
            >
              <Typography variant="h6" sx={{ mb: 1 }}>
                No services found
              </Typography>
              <Typography variant="body2">
                {searchQuery || statusFilter !== 'all' 
                  ? 'Try adjusting your search or filter criteria'
                  : 'No service health data available'
                }
              </Typography>
            </Box>
          ) : (
            <Grid container spacing={2}>
              {filteredServices.map((service) => (
                <Grid 
                  item 
                  xs={12} 
                  sm={viewMode === 'list' ? 12 : 6} 
                  md={viewMode === 'list' ? 12 : 4} 
                  lg={viewMode === 'list' ? 12 : 3} 
                  key={service.service_name}
                >
                  <ServiceHealthCard
                    service={service}
                    onServiceClick={onServiceClick}
                    expanded={expandedServices.has(service.service_name)}
                    onToggleExpanded={() => toggleServiceExpanded(service.service_name)}
                    showMetrics={true}
                  />
                </Grid>
              ))}
            </Grid>
          )}
        </>
      )}

      {/* Results summary */}
      {!isLoading && filteredServices.length > 0 && (
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Showing {filteredServices.length} of {services.length} services
            {searchQuery && ` matching "${searchQuery}"`}
            {statusFilter !== 'all' && ` with ${statusFilter} status`}
          </Typography>
        </Box>
      )}
    </Box>
  );
};