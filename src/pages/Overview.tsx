import React, { useState } from 'react';
import { Grid, Box, Tab, Tabs, Paper, Typography, Divider } from '@mui/material';
import { TopStatsPanel } from '../components/TopStatsPanel';
import { FunnelChart } from '../components/FunnelChart';
import { ConversionFunnel } from '../components/ConversionFunnel';
import { TopMetricsPanels } from '../components/TopMetricsPanels';
import { HeatmapCalendar } from '../components/HeatmapCalendar';
import { SessionRecordsTable } from '../components/SessionRecordsTable';
import { EventFilters } from '../components/EventFilters';
import { EventCategoryChart } from '../components/EventCategoryChart';
import { EventImportanceChart } from '../components/EventImportanceChart';
import { UserJourney } from '../components/UserJourney';
import { DataValidationDashboard } from '../components/DataValidationDashboard';
import { useDashboardData } from '../hooks/useDashboardData';
import { useLiveEvents } from '../hooks/useLiveEvents';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../api/analytics';
import { sessionsApi } from '../api/sessions';
import { useTimeFilter } from '../contexts/TimeFilterContext';
import { EventType } from '../types';
// import { metricsCalculator } from '../utils/metricsCalculator';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`analytics-tabpanel-${index}`}
      aria-labelledby={`analytics-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export const Overview: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [eventFilters, setEventFilters] = useState({
    categories: [] as string[],
    eventTypes: [] as EventType[],
    importance: [] as string[],
    timeRange: 'all' as string,
    searchText: '' as string
  });
  
  const { selectedFilter } = useTimeFilter();
  const {
    metrics,
    funnelData,
    topDestinations,
    topHotels,
    isLoading: dashboardLoading,
  } = useDashboardData();

  const { 
    activeUsers, 
    liveSessions,
    liveEvents
  } = useLiveEvents();

  // Get heatmap data
  const { data: heatmapData = [] } = useQuery({
    queryKey: ['heatmapData', selectedFilter.value],
    queryFn: async () => {
      const { start, end } = { 
        start: new Date(Date.now() - selectedFilter.hours * 60 * 60 * 1000).toISOString(),
        end: new Date().toISOString()
      };
      return analyticsApi.getHeatmapData({ 
        start: start.split('T')[0], 
        end: end.split('T')[0] 
      });
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Get sessions for the table
  const { data: sessionsData } = useQuery({
    queryKey: ['sessions', selectedFilter.value],
    queryFn: () => sessionsApi.getLiveSessions(),
    staleTime: 30 * 1000, // 30 seconds
  });

  // Calculate funnel stats from the funnel data
  const funnelStats = React.useMemo(() => {
    if (!funnelData || funnelData.length === 0) return [];
    
    return funnelData.map((stage) => ({
      stage: stage.name,
      count: stage.count,
      percentage: stage.percentage,
      dropOffRate: stage.dropOff
    }));
  }, [funnelData]);

  // Combine live sessions with recent sessions for the table
  const allSessions = React.useMemo(() => {
    const combined = [...liveSessions];
    if (sessionsData) {
      sessionsData.forEach(session => {
        if (!combined.find(s => s.sessionId === session.sessionId)) {
          combined.push(session);
        }
      });
    }
    return combined.slice(0, 50); // Limit to 50 sessions
  }, [liveSessions, sessionsData]);

  const handleSessionClick = (session: any) => {
    console.log('Session clicked:', session);
    // Here you could open a modal or navigate to session details
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Convert ActivityRecord to AnalyticsEvent format for new components
  const convertToAnalyticsEvents = React.useMemo(() => {
    if (!liveEvents) return [];

    return liveEvents
      .filter(event => event.metadata?.originalEventType) // Only events with metadata
      .map(event => ({
        eventId: event.id,
        sessionId: event.sessionId,
        eventType: event.metadata!.originalEventType,
        timestamp: event.timestamp,
        data: {},
        userAgent: event.details
      }));
  }, [liveEvents]);

  // Filter live events based on current filters
  const filteredEvents = React.useMemo(() => {
    if (!convertToAnalyticsEvents) return [];
    
    return convertToAnalyticsEvents.filter(event => {
      // For now, return all events since filtering is complex with the current data structure
      // TODO: Implement proper filtering once component interfaces are established
      if (eventFilters.searchText) {
        const searchLower = eventFilters.searchText.toLowerCase();
        if (!event.sessionId.toLowerCase().includes(searchLower) &&
            !event.eventType.toLowerCase().includes(searchLower)) {
          return false;
        }
      }

      // Apply time range filter
      if (eventFilters.timeRange !== 'all') {
        const eventTime = new Date(event.timestamp).getTime();
        const now = Date.now();
        switch (eventFilters.timeRange) {
          case '1h':
            return eventTime > now - 60 * 60 * 1000;
          case '24h':
            return eventTime > now - 24 * 60 * 60 * 1000;
          case '7d':
            return eventTime > now - 7 * 24 * 60 * 60 * 1000;
        }
      }

      return true;
    });
  }, [liveEvents, eventFilters]);

  // Get unique session IDs from filtered events for UserJourney components
  const uniqueSessionIds = React.useMemo(() => {
    const sessionIds = new Set<string>();
    filteredEvents.forEach(event => sessionIds.add(event.sessionId));
    return Array.from(sessionIds).slice(0, 10); // Show top 10 sessions
  }, [filteredEvents]);

  return (
    <Box sx={{ width: '100%' }}>
      {/* Dashboard Header - Simple Layout */}
      <Box sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        mb: 3,
        pb: 2,
        borderBottom: '1px solid #e0e0e0'
      }}>
        <Typography variant="h4" sx={{
          fontWeight: 400,
          color: '#000000',
          fontSize: '2.125rem',
          fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif'
        }}>
          Real-Time Analytics Dashboard
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="caption" sx={{
            color: 'rgba(0, 0, 0, 0.6)',
            fontSize: '0.875rem'
          }}>
            Last updated: Aug 29, 2024, 06:17 PM
          </Typography>
          <Box sx={{
            bgcolor: '#e8f5e8',
            color: '#2e7d32',
            px: 1,
            py: 0.5,
            borderRadius: '4px',
            fontSize: '0.75rem',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: 0.5
          }}>
            <Box sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: '#4caf50'
            }} />
            Real-time Connected
          </Box>
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
            Refresh
          </Box>
          <Box sx={{
            color: '#666666',
            px: 1,
            py: 0.5,
            fontSize: '0.75rem',
            cursor: 'pointer'
          }}>
            Force Refresh
          </Box>
          <Box sx={{
            bgcolor: '#fff3e0',
            color: '#e65100',
            px: 1,
            py: 0.5,
            borderRadius: '4px',
            fontSize: '0.75rem',
            fontWeight: 500
          }}>
            🔍 Debug OFF
          </Box>
        </Box>
      </Box>

      {/* Time Filter Row */}
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        mb: 3
      }}>
        <Box sx={{ color: '#666666', mr: 1 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M10,18c1.846,0,3.543-0.635,4.897-1.688l4.396,4.396l1.414-1.414l-4.396-4.396C17.365,13.543,18,11.846,18,10 c0-4.411-3.589-8-8-8s-8,3.589-8,8S5.589,18,10,18z M10,4c3.309,0,6,2.691,6,6s-2.691,6-6,6s-6-2.691-6-6S6.691,4,10,4z"/>
          </svg>
        </Box>
        <Typography sx={{
          color: 'rgba(0, 0, 0, 0.6)',
          fontSize: '0.875rem',
          mr: 1
        }}>
          Time Filter:
        </Typography>
        {[
          { label: 'All Time', value: 'all', active: true },
          { label: 'Today', value: 'today', active: false },
          { label: 'This Week', value: 'week', active: false },
          { label: 'This Month', value: 'month', active: false }
        ].map((filter) => (
          <Box
            key={filter.value}
            sx={{
              px: 2,
              py: 0.5,
              borderRadius: '4px',
              fontSize: '0.875rem',
              fontWeight: 500,
              cursor: 'pointer',
              bgcolor: filter.active ? '#1976d2' : 'transparent',
              color: filter.active ? 'white' : '#1976d2',
              border: '1px solid #1976d2',
              '&:hover': {
                bgcolor: filter.active ? '#1565c0' : 'rgba(25, 118, 210, 0.04)'
              }
            }}
          >
            {filter.label}
          </Box>
        ))}
      </Box>

      {/* Top Statistics Cards */}
      <TopStatsPanel
        metrics={metrics || null}
        activeUsers={activeUsers}
        loading={dashboardLoading}
      />

      {/* Analytics Tabs */}
      <Paper sx={{ mt: 3, border: '1px solid #e0e0e0' }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange} 
          aria-label="analytics tabs"
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Overview" id="analytics-tab-0" />
          <Tab label="Event Analytics" id="analytics-tab-1" />
          <Tab label="Conversion Funnel" id="analytics-tab-2" />
          <Tab label="User Journeys" id="analytics-tab-3" />
          <Tab label="Data Validation" id="analytics-tab-4" />
          <Tab label="Legacy Reports" id="analytics-tab-5" />
        </Tabs>

        {/* Tab 0: Overview - Main Dashboard Layout */}
        <TabPanel value={tabValue} index={0}>
          {/* Three Column Section Header */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h5" sx={{
              fontWeight: 600,
              color: '#1a1a1a',
              fontSize: '1.25rem',
              mb: 1,
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            }}>
              Key Performance Metrics
            </Typography>
            <Typography variant="body2" sx={{
              color: '#666666',
              fontSize: '0.875rem'
            }}>
              Real-time insights into destination performance, hotel analytics, and conversion funnel metrics
            </Typography>
          </Box>

          <Grid container spacing={3} sx={{ mb: 4 }}>
            {/* Three Panel Layout - Top Destinations, Top Hotels, Funnel Stats */}
            <Grid item xs={12} lg={4}>
              <TopMetricsPanels
                topDestinations={topDestinations}
                topHotels={[]} // Will be empty for destinations panel
                funnelStats={[]}
                loading={dashboardLoading}
                panelType="destinations"
              />
            </Grid>

            <Grid item xs={12} lg={4}>
              <TopMetricsPanels
                topDestinations={[]}
                topHotels={topHotels}
                funnelStats={[]}
                loading={dashboardLoading}
                panelType="hotels"
              />
            </Grid>

            <Grid item xs={12} lg={4}>
              <TopMetricsPanels
                topDestinations={[]}
                topHotels={[]}
                funnelStats={funnelStats}
                loading={dashboardLoading}
                panelType="funnel"
              />
            </Grid>
          </Grid>

          {/* User Journey Analytics - Large Heatmap */}
          <Grid container spacing={3} sx={{ mt: 2 }}>
            <Grid item xs={12}>
              <HeatmapCalendar
                data={heatmapData}
                loading={dashboardLoading}
                height={400}
                title="User Journey Analytics"
                subtitle="Destination exploration patterns and selection evolution"
              />
            </Grid>

            {/* Session Records Table */}
            <Grid item xs={12}>
              <SessionRecordsTable
                useRealtime={true}
                title="Session Records"
                subtitle="User journeys with destination breakdown tracking"
                onSessionClick={handleSessionClick}
              />
            </Grid>
          </Grid>
        </TabPanel>

        {/* Tab 1: Event Analytics */}
        <TabPanel value={tabValue} index={1}>
          <Grid container spacing={3}>
            {/* Event Filters */}
            <Grid item xs={12}>
              <EventFilters
                onFiltersChange={setEventFilters}
                initialFilters={eventFilters}
              />
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Filtered Results: {filteredEvents.length.toLocaleString()} events
              </Typography>
              <Divider sx={{ mb: 3 }} />
            </Grid>
            
            {/* Category and Importance Charts */}
            <Grid item xs={12} lg={6}>
              <EventCategoryChart 
                events={filteredEvents}
                height={400}
              />
            </Grid>
            
            <Grid item xs={12} lg={6}>
              <EventImportanceChart 
                events={filteredEvents}
                height={400}
              />
            </Grid>
          </Grid>
        </TabPanel>

        {/* Tab 2: Enhanced Conversion Funnel */}
        <TabPanel value={tabValue} index={2}>
          <ConversionFunnel 
            events={filteredEvents}
            loading={dashboardLoading}
            height={500}
          />
        </TabPanel>

        {/* Tab 3: User Journeys */}
        <TabPanel value={tabValue} index={3}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Active User Sessions ({uniqueSessionIds.length.toLocaleString()})
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Individual user journeys through the booking flow
              </Typography>
            </Grid>

            {uniqueSessionIds.map(sessionId => (
              <Grid item xs={12} md={6} xl={4} key={sessionId}>
                <UserJourney
                  sessionId={sessionId}
                  events={filteredEvents}
                  compact={true}
                  maxEvents={15}
                />
              </Grid>
            ))}

            {uniqueSessionIds.length === 0 && (
              <Grid item xs={12}>
                <Paper sx={{ p: 4, textAlign: 'center', bgcolor: 'grey.50' }}>
                  <Typography variant="body1" color="text.secondary">
                    No active sessions found. Adjust filters to see user journeys.
                  </Typography>
                </Paper>
              </Grid>
            )}
          </Grid>
        </TabPanel>

        {/* Tab 4: Data Validation */}
        <TabPanel value={tabValue} index={4}>
          <DataValidationDashboard />
        </TabPanel>

        {/* Tab 5: Legacy Reports */}
        <TabPanel value={tabValue} index={5}>
          <Grid container spacing={3}>
            {/* Legacy Funnel Chart */}
            <Grid item xs={12} lg={8}>
              <FunnelChart 
                stages={funnelData}
                loading={dashboardLoading}
                height={450}
                title="Legacy Funnel Analysis"
              />
            </Grid>

            {/* Top Metrics Panels */}
            <Grid item xs={12} lg={4}>
              <TopMetricsPanels
                topDestinations={topDestinations}
                topHotels={topHotels}
                funnelStats={funnelStats}
                loading={dashboardLoading}
              />
            </Grid>
            
            {/* Heatmap */}
            <Grid item xs={12} lg={7}>
              <HeatmapCalendar 
                data={heatmapData}
                loading={dashboardLoading}
                height={350}
              />
            </Grid>

            {/* Sessions Table */}
            <Grid item xs={12} lg={5}>
              <SessionRecordsTable
                useRealtime={true}
                title="Live Session Records"
                onSessionClick={handleSessionClick}
              />
            </Grid>
          </Grid>
        </TabPanel>
      </Paper>
    </Box>
  );
};