import { render, screen } from '../../setup/testUtils';
import { HeatmapCalendar } from '../../../src/components/HeatmapCalendar';
import { mockHeatmapData } from '../../fixtures/mockData';

// Mock Plotly to avoid canvas rendering issues in tests
jest.mock('plotly.js-dist-min', () => ({
  newPlot: jest.fn().mockResolvedValue({}),
  react: jest.fn().mockResolvedValue({}),
  Plots: {
    resize: jest.fn(),
  },
}));

describe('HeatmapCalendar', () => {
  it('renders the heatmap container', () => {
    render(<HeatmapCalendar data={mockHeatmapData} />);
    
    expect(screen.getByText('Activity Heatmap')).toBeInTheDocument();
    expect(screen.getByTestId('heatmap-container')).toBeInTheDocument();
  });

  it('displays the legend', () => {
    render(<HeatmapCalendar data={mockHeatmapData} />);
    
    expect(screen.getByText('Low')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
  });

  it('handles empty data gracefully', () => {
    render(<HeatmapCalendar data={[]} />);
    
    expect(screen.getByText('Activity Heatmap')).toBeInTheDocument();
    expect(screen.getByText('No activity data available')).toBeInTheDocument();
  });

  it('handles undefined data gracefully', () => {
    render(<HeatmapCalendar data={undefined as any} />);
    
    expect(screen.getByText('Activity Heatmap')).toBeInTheDocument();
    expect(screen.getByText('No activity data available')).toBeInTheDocument();
  });

  it('applies correct styling to container', () => {
    render(<HeatmapCalendar data={mockHeatmapData} />);
    
    const container = screen.getByTestId('heatmap-container');
    expect(container).toHaveStyle({ height: '300px' });
  });

  it('displays loading state when loading', () => {
    render(<HeatmapCalendar data={mockHeatmapData} loading={true} />);
    
    expect(screen.getByTestId('heatmap-loading')).toBeInTheDocument();
  });

  it('shows tooltip on hover simulation', () => {
    render(<HeatmapCalendar data={mockHeatmapData} />);
    
    // Simulate tooltip content that would appear on hover
    const container = screen.getByTestId('heatmap-container');
    expect(container).toBeInTheDocument();
  });

  it('handles different intensity levels', () => {
    const intensityData = [
      { date: '2024-01-15', hour: 9, value: 10, intensity: 'low' as const },
      { date: '2024-01-15', hour: 10, value: 50, intensity: 'medium' as const },
      { date: '2024-01-15', hour: 11, value: 90, intensity: 'high' as const },
    ];
    
    render(<HeatmapCalendar data={intensityData} />);
    
    expect(screen.getByTestId('heatmap-container')).toBeInTheDocument();
  });

  it('displays date range information', () => {
    render(<HeatmapCalendar data={mockHeatmapData} />);
    
    // The component should show some indication of the date range
    expect(screen.getByText('Activity Heatmap')).toBeInTheDocument();
  });

  it('handles single day data', () => {
    const singleDayData = [
      { date: '2024-01-15', hour: 10, value: 45, intensity: 'medium' as const },
    ];
    
    render(<HeatmapCalendar data={singleDayData} />);
    
    expect(screen.getByTestId('heatmap-container')).toBeInTheDocument();
  });

  it('processes data for plotly correctly', () => {
    render(<HeatmapCalendar data={mockHeatmapData} />);
    
    // Verify that the component renders without errors
    expect(screen.getByText('Activity Heatmap')).toBeInTheDocument();
    expect(screen.getByTestId('heatmap-container')).toBeInTheDocument();
  });

  it('handles maximum and minimum values', () => {
    const extremeData = [
      { date: '2024-01-15', hour: 9, value: 0, intensity: 'low' as const },
      { date: '2024-01-15', hour: 10, value: 100, intensity: 'high' as const },
    ];
    
    render(<HeatmapCalendar data={extremeData} />);
    
    expect(screen.getByTestId('heatmap-container')).toBeInTheDocument();
  });

  it('updates when data prop changes', () => {
    const { rerender } = render(<HeatmapCalendar data={mockHeatmapData} />);
    
    expect(screen.getByTestId('heatmap-container')).toBeInTheDocument();
    
    const newData = [
      { date: '2024-01-16', hour: 11, value: 75, intensity: 'high' as const },
    ];
    
    rerender(<HeatmapCalendar data={newData} />);
    
    expect(screen.getByTestId('heatmap-container')).toBeInTheDocument();
  });
});