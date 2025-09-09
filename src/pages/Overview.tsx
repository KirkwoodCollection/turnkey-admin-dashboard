import React from 'react';
import { Grid, Box } from '@mui/material';
import { TopStatsPanel } from '../components/TopStatsPanel';
import { FunnelChart } from '../components/FunnelChart';
import { TopMetricsPanels } from '../components/TopMetricsPanels';
import { HeatmapCalendar } from '../components/HeatmapCalendar';
import { SessionRecordsTable } from '../components/SessionRecordsTable';
import { useDashboardData } from '../hooks/useDashboardData';
import { useLiveEvents } from '../hooks/useLiveEvents';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../api/analytics';
import { sessionsApi } from '../api/sessions';
import { useTimeFilter } from '../contexts/TimeFilterContext';
// import { metricsCalculator } from '../utils/metricsCalculator';

export const Overview: React.FC = () => {
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
      dropOffRate: stage.dropOff || 0
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

  return (
    <Box sx={{ width: '100%' }}>
      {/* Top Statistics Cards */}
      <TopStatsPanel 
        metrics={metrics || null}
        activeUsers={activeUsers}
        loading={dashboardLoading}
      />

      {/* Main Analytics Section */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Left side - Funnel Chart */}
        <Grid item xs={12} lg={8}>
          <FunnelChart 
            stages={funnelData}
            loading={dashboardLoading}
            height={450}
          />
        </Grid>

        {/* Right side - Top Metrics Panels */}
        <Grid item xs={12} lg={4}>
          <TopMetricsPanels
            topDestinations={topDestinations}
            topHotels={topHotels}
            funnelStats={funnelStats}
            loading={dashboardLoading}
          />
        </Grid>
      </Grid>

      {/* Bottom Section - Heatmap and Sessions */}
      <Grid container spacing={3}>
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
            sessions={allSessions}
            loading={dashboardLoading}
            onSessionClick={handleSessionClick}
          />
        </Grid>
      </Grid>
    </Box>
  );
};