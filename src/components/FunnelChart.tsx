import React, { useMemo } from 'react';
import Plot from 'react-plotly.js';
import { Card, CardContent, Typography, Box, Skeleton } from '@mui/material';
import { FunnelStage } from '../types';

interface FunnelChartProps {
  stages: FunnelStage[];
  loading?: boolean;
  height?: number;
  title?: string;
}

export const FunnelChart: React.FC<FunnelChartProps> = ({
  stages,
  loading = false,
  height = 400,
  title = "User Journey Analytics"
}) => {
  const chartData = useMemo(() => {
    if (!stages || stages.length === 0) return null;

    return [
      {
        type: 'funnel' as const,
        y: stages.map(s => s.name),
        x: stages.map(s => s.count),
        text: stages.map(s => `${s.count.toLocaleString()}`),
        textposition: 'inside' as const,
        textfont: {
          size: 14,
          color: 'white',
          family: 'Arial, sans-serif'
        },
        hovertemplate: '<b>%{y}</b><br>' +
          'Count: %{x:,}<br>' +
          'Percentage: %{percentInitial}<br>' +
          '<extra></extra>',
        marker: {
          color: [
            '#1976d2', // Deep blue
            '#1e88e5', // Blue
            '#2196f3', // Light blue
            '#42a5f5', // Lighter blue
            '#64b5f6', // Even lighter blue
            '#90caf9', // Very light blue
            '#bbdefb', // Pale blue
            '#e3f2fd', // Very pale blue
            '#4caf50', // Success green for final conversion
            '#66bb6a', // Light green
          ],
          line: {
            color: 'rgba(255, 255, 255, 0.6)',
            width: 2
          }
        },
      },
    ];
  }, [stages]);

  if (loading) {
    return (
      <Card sx={{ height: height + 100 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Conversion funnel through booking stages
          </Typography>
          <Skeleton variant="rectangular" height={height} />
        </CardContent>
      </Card>
    );
  }

  if (!chartData) {
    return (
      <Card sx={{ height: height + 100 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Conversion funnel through booking stages
          </Typography>
          <Box sx={{ 
            height, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            bgcolor: 'grey.50',
            borderRadius: 1
          }}>
            <Typography color="text.secondary">No data available</Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ height: height + 100 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Conversion funnel through booking stages
        </Typography>
        <Plot
          data={chartData}
          layout={{
            height,
            margin: { l: 120, r: 20, t: 20, b: 20 },
            paper_bgcolor: 'transparent',
            plot_bgcolor: 'transparent',
            font: {
              size: 12,
              family: 'Arial, sans-serif',
              color: '#333'
            },
            showlegend: false,
            // Customize appearance
            autosize: true,
          }}
          config={{
            displayModeBar: false,
            responsive: true,
            doubleClick: 'reset',
          }}
          style={{ width: '100%', height: '100%' }}
          useResizeHandler={true}
        />
        
        {/* Stage Statistics Summary */}
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          {stages.slice(0, 3).map((stage, index) => (
            <Box key={index} sx={{ textAlign: 'center', minWidth: 80 }}>
              <Typography variant="h6" color="primary">
                {stage.count.toLocaleString()}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {stage.name}
              </Typography>
            </Box>
          ))}
          {stages.length > 3 && (
            <Box sx={{ textAlign: 'center', minWidth: 80 }}>
              <Typography variant="h6" color="success.main">
                {stages[stages.length - 1]?.count.toLocaleString() || '0'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Converted
              </Typography>
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};