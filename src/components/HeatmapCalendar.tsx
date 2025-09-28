import React, { useMemo } from 'react';
import Plot from 'react-plotly.js';
import { Card, CardContent, Typography, Box, Skeleton } from '@mui/material';
import { HeatmapData } from '../types';

interface HeatmapCalendarProps {
  data: HeatmapData[];
  loading?: boolean;
  height?: number;
  title?: string;
  subtitle?: string;
}

export const HeatmapCalendar: React.FC<HeatmapCalendarProps> = ({
  data,
  loading = false,
  height = 300,
  title = "User Activity Heatmap",
  subtitle
}) => {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) {
      return null;
    }

    // Group data by date and hour/value
    const dateValueMap = new Map<string, Map<number, number>>();
    const dates = new Set<string>();
    const values = new Set<number>();

    data.forEach(item => {
      dates.add(item.date);
      values.add(item.hour || 0); // Use hour or default to 0
      if (!dateValueMap.has(item.date)) {
        dateValueMap.set(item.date, new Map());
      }
      dateValueMap.get(item.date)!.set(item.hour || 0, item.value);
    });

    const sortedDates = Array.from(dates).sort();
    const sortedValues = Array.from(values).sort((a, b) => a - b);

    // Create 2D array for heatmap
    const heatmapValues: number[][] = [];

    sortedValues.forEach(value => {
      const valueRow: number[] = [];
      sortedDates.forEach(date => {
        const cellValue = dateValueMap.get(date)?.get(value) || 0;
        valueRow.push(cellValue);
      });
      heatmapValues.push(valueRow);
    });

    return [
      {
        type: 'heatmap' as const,
        z: heatmapValues,
        x: sortedDates,
        y: sortedValues.map(v => v.toString()),
        hovertemplate: 'Date: %{x}<br>Value: %{y}<br>Activity: %{z}<extra></extra>',
        colorscale: [
          [0, '#fef3cd'], // Very light yellow
          [0.2, '#fde68a'], // Light yellow
          [0.4, '#fcd34d'], // Medium yellow
          [0.6, '#f59e0b'], // Orange
          [0.8, '#d97706'], // Dark orange
          [1, '#dc2626'], // Red (high activity)
        ],
        showscale: true,
        colorbar: {
          title: {
            text: 'Activity<br>Level',
            side: 'right'
          },
          thickness: 15,
          len: 0.7,
          x: 1.02,
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography sx={{
              color: 'rgba(0, 0, 0, 0.6)',
              fontSize: '0.875rem'
            }}>
              2D View
            </Typography>
            <Box sx={{
              width: 40,
              height: 20,
              borderRadius: '10px',
              bgcolor: '#e0e0e0',
              position: 'relative',
              cursor: 'pointer'
            }}>
              <Box sx={{
                width: 16,
                height: 16,
                borderRadius: '50%',
                bgcolor: '#fff',
                position: 'absolute',
                top: 2,
                left: 2,
                boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
              }} />
            </Box>
            <Typography sx={{
              color: 'rgba(0, 0, 0, 0.6)',
              fontSize: '0.875rem'
            }}>
              3D View
            </Typography>
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
          2D User Journey Heatmap: Search Activity by Destination & Days Until Arrival (Darker = More Activity)
        </Typography>

        <Plot
          data={chartData as any}
          layout={{
            height,
            margin: { l: 120, r: 80, t: 20, b: 60 },
            paper_bgcolor: 'transparent',
            plot_bgcolor: 'transparent',
            font: {
              size: 11,
              family: 'Arial, sans-serif',
              color: '#666'
            },
            xaxis: {
              title: {
                text: 'Days Until Arrival',
                font: { size: 12, color: '#666' }
              },
              tickmode: 'linear',
              dtick: 5,
              showgrid: true,
              gridcolor: '#f0f0f0',
              zeroline: false,
            },
            yaxis: {
              title: {
                text: '',
                font: { size: 12, color: '#666' }
              },
              showgrid: true,
              gridcolor: '#f0f0f0',
              zeroline: false,
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
      </CardContent>
    </Card>
  );
};