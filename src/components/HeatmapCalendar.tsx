import React, { useMemo } from 'react';
import Plot from 'react-plotly.js';
import { Card, CardContent, Typography, Box, Skeleton } from '@mui/material';
import { HeatmapData } from '../types';

interface HeatmapCalendarProps {
  data: HeatmapData[];
  loading?: boolean;
  height?: number;
  title?: string;
}

export const HeatmapCalendar: React.FC<HeatmapCalendarProps> = ({
  data,
  loading = false,
  height = 300,
  title = "User Activity Heatmap"
}) => {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return null;

    // Group data by date and hour
    const dateHourMap = new Map<string, Map<number, number>>();
    const dates = new Set<string>();
    const hours = Array.from({ length: 24 }, (_, i) => i);

    data.forEach(item => {
      dates.add(item.date);
      if (!dateHourMap.has(item.date)) {
        dateHourMap.set(item.date, new Map());
      }
      dateHourMap.get(item.date)!.set(item.hour, item.value);
    });

    const sortedDates = Array.from(dates).sort();
    
    // Create 2D array for heatmap
    const heatmapValues: number[][] = [];
    const customText: string[][] = [];
    
    hours.forEach(hour => {
      const hourValues: number[] = [];
      const hourTexts: string[] = [];
      
      sortedDates.forEach(date => {
        const value = dateHourMap.get(date)?.get(hour) || 0;
        hourValues.push(value);
        hourTexts.push(`${value} events\n${date} ${hour.toString().padStart(2, '0')}:00`);
      });
      
      heatmapValues.push(hourValues);
      customText.push(hourTexts);
    });

    return [
      {
        type: 'heatmap' as const,
        z: heatmapValues,
        x: sortedDates,
        y: hours.map(h => `${h.toString().padStart(2, '0')}:00`),
        // text: customText, // Causes TypeScript issues
        hovertemplate: 'Value: %{z}<extra></extra>',
        colorscale: [
          [0, 'rgba(59, 130, 246, 0.1)'], // Very light blue
          [0.2, 'rgba(59, 130, 246, 0.3)'], // Light blue
          [0.4, 'rgba(59, 130, 246, 0.5)'], // Medium blue
          [0.6, 'rgba(59, 130, 246, 0.7)'], // Darker blue
          [0.8, 'rgba(37, 99, 235, 0.8)'], // Dark blue
          [1, 'rgba(29, 78, 216, 1.0)'], // Very dark blue
        ],
        showscale: true,
        colorbar: {
          title: 'Activity Level',
          titleside: 'right',
          thickness: 15,
          len: 0.7,
        },
      },
    ];
  }, [data]);

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            User activity by date and time
          </Typography>
          <Skeleton variant="rectangular" height={height} />
        </CardContent>
      </Card>
    );
  }

  if (!chartData) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            User activity by date and time
          </Typography>
          <Box sx={{ 
            height, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            bgcolor: 'grey.50',
            borderRadius: 1
          }}>
            <Typography color="text.secondary">No activity data available</Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          User activity intensity by date and time of day
        </Typography>
        <Plot
          data={chartData as any}
          layout={{
            height,
            margin: { l: 60, r: 80, t: 20, b: 80 },
            paper_bgcolor: 'transparent',
            plot_bgcolor: 'transparent',
            font: {
              size: 11,
              family: 'Arial, sans-serif',
              color: '#333'
            },
            xaxis: {
              title: { text: 'Date' },
              tickangle: -45,
              automargin: true,
            },
            yaxis: {
              title: { text: 'Hour of Day' },
              autorange: 'reversed' as const,
            },
            showlegend: false,
          } as any}
          config={{
            displayModeBar: false,
            responsive: true,
          }}
          style={{ width: '100%' }}
          useResizeHandler={true}
        />
        
        {/* Legend */}
        <Box sx={{ 
          mt: 2, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          gap: 3,
          flexWrap: 'wrap'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ 
              width: 16, 
              height: 16, 
              bgcolor: 'rgba(59, 130, 246, 0.2)',
              border: '1px solid rgba(59, 130, 246, 0.4)'
            }} />
            <Typography variant="caption" color="text.secondary">
              Low Activity
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ 
              width: 16, 
              height: 16, 
              bgcolor: 'rgba(59, 130, 246, 0.6)',
              border: '1px solid rgba(59, 130, 246, 0.8)'
            }} />
            <Typography variant="caption" color="text.secondary">
              Medium Activity
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ 
              width: 16, 
              height: 16, 
              bgcolor: 'rgba(29, 78, 216, 1.0)',
              border: '1px solid rgba(29, 78, 216, 1.0)'
            }} />
            <Typography variant="caption" color="text.secondary">
              High Activity
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};