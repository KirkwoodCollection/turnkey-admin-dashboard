import { render, screen } from '../../setup/testUtils';
import { FunnelChart } from '../../../src/components/FunnelChart';
import { mockDashboardMetrics } from '../../fixtures/mockData';

// Mock Plotly to avoid canvas rendering issues in tests
jest.mock('plotly.js-dist-min', () => ({
  newPlot: jest.fn().mockResolvedValue({}),
  react: jest.fn().mockResolvedValue({}),
  Plots: {
    resize: jest.fn(),
  },
}));

describe('FunnelChart', () => {
  it('renders the chart container', () => {
    render(<FunnelChart data={mockDashboardMetrics.funnelStats} />);
    
    expect(screen.getByText('Booking Funnel')).toBeInTheDocument();
    expect(screen.getByTestId('funnel-chart-container')).toBeInTheDocument();
  });

  it('displays all funnel stages', () => {
    render(<FunnelChart data={mockDashboardMetrics.funnelStats} />);
    
    mockDashboardMetrics.funnelStats.forEach((stage) => {
      expect(screen.getByText(stage.stage)).toBeInTheDocument();
    });
  });

  it('shows stage counts and percentages', () => {
    render(<FunnelChart data={mockDashboardMetrics.funnelStats} />);
    
    expect(screen.getByText('1,000 (100.0%)')).toBeInTheDocument();
    expect(screen.getByText('850 (85.0%)')).toBeInTheDocument();
    expect(screen.getByText('203 (20.3%)')).toBeInTheDocument();
  });

  it('displays drop-off rates for stages', () => {
    render(<FunnelChart data={mockDashboardMetrics.funnelStats} />);
    
    expect(screen.getByText('15.0% drop-off')).toBeInTheDocument();
    expect(screen.getByText('20.0% drop-off')).toBeInTheDocument();
  });

  it('handles empty data gracefully', () => {
    render(<FunnelChart data={[]} />);
    
    expect(screen.getByText('Booking Funnel')).toBeInTheDocument();
    expect(screen.getByText('No funnel data available')).toBeInTheDocument();
  });

  it('handles missing data gracefully', () => {
    render(<FunnelChart data={undefined as any} />);
    
    expect(screen.getByText('Booking Funnel')).toBeInTheDocument();
    expect(screen.getByText('No funnel data available')).toBeInTheDocument();
  });

  it('applies correct styling to chart container', () => {
    render(<FunnelChart data={mockDashboardMetrics.funnelStats} />);
    
    const container = screen.getByTestId('funnel-chart-container');
    expect(container).toHaveStyle({ height: '400px' });
  });

  it('calculates conversion rates correctly', () => {
    const customData = [
      { stage: 'Visitors', count: 1000, percentage: 100.0, dropOffRate: 0 },
      { stage: 'Searches', count: 500, percentage: 50.0, dropOffRate: 50.0 },
      { stage: 'Bookings', count: 100, percentage: 10.0, dropOffRate: 80.0 },
    ];
    
    render(<FunnelChart data={customData} />);
    
    expect(screen.getByText('1,000 (100.0%)')).toBeInTheDocument();
    expect(screen.getByText('500 (50.0%)')).toBeInTheDocument();
    expect(screen.getByText('100 (10.0%)')).toBeInTheDocument();
  });

  it('handles single stage data', () => {
    const singleStage = [
      { stage: 'Visitors', count: 100, percentage: 100.0, dropOffRate: 0 },
    ];
    
    render(<FunnelChart data={singleStage} />);
    
    expect(screen.getByText('Visitors')).toBeInTheDocument();
    expect(screen.getByText('100 (100.0%)')).toBeInTheDocument();
  });

  it('displays loading state when data is loading', () => {
    render(<FunnelChart data={mockDashboardMetrics.funnelStats} loading={true} />);
    
    expect(screen.getByTestId('funnel-loading')).toBeInTheDocument();
  });

  it('formats large numbers correctly', () => {
    const largeNumberData = [
      { stage: 'Visitors', count: 1000000, percentage: 100.0, dropOffRate: 0 },
      { stage: 'Bookings', count: 50000, percentage: 5.0, dropOffRate: 95.0 },
    ];
    
    render(<FunnelChart data={largeNumberData} />);
    
    expect(screen.getByText('1,000,000 (100.0%)')).toBeInTheDocument();
    expect(screen.getByText('50,000 (5.0%)')).toBeInTheDocument();
  });
});