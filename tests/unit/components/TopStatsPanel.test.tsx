import { render, screen } from '../../setup/testUtils';
import { TopStatsPanel } from '../../../src/components/TopStatsPanel';
import { mockDashboardMetrics } from '../../fixtures/mockData';

describe('TopStatsPanel', () => {
  it('renders all stats with correct values', () => {
    render(<TopStatsPanel metrics={mockDashboardMetrics} loading={false} />);
    
    expect(screen.getByText('Active Users')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    
    expect(screen.getByText('Total Searches')).toBeInTheDocument();
    expect(screen.getByText('1.6K')).toBeInTheDocument();
    
    expect(screen.getByText('Total Bookings')).toBeInTheDocument();
    expect(screen.getByText('234')).toBeInTheDocument();
    
    expect(screen.getByText('Conversion Rate')).toBeInTheDocument();
    expect(screen.getByText('14.9%')).toBeInTheDocument();
    
    expect(screen.getByText('Abandonment Rate')).toBeInTheDocument();
    expect(screen.getByText('31.2%')).toBeInTheDocument();
    
    expect(screen.getByText('Avg Session Duration')).toBeInTheDocument();
    expect(screen.getByText('5m 42s')).toBeInTheDocument();
  });

  it('displays loading state correctly', () => {
    render(<TopStatsPanel metrics={null} loading={true} />);
    
    const skeletons = screen.getAllByTestId(/skeleton/i);
    expect(skeletons).toHaveLength(6);
  });

  it('handles null metrics gracefully', () => {
    render(<TopStatsPanel metrics={null} loading={false} />);
    
    expect(screen.getByText('Active Users')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
    
    expect(screen.getByText('Total Searches')).toBeInTheDocument();
    expect(screen.getByText('--')).toBeInTheDocument();
  });

  it('formats numbers correctly', () => {
    const customMetrics = {
      ...mockDashboardMetrics,
      totalSearches: 1234567,
      averageSessionDuration: 3661, // 1h 1m 1s
    };
    
    render(<TopStatsPanel metrics={customMetrics} loading={false} />);
    
    expect(screen.getByText('1.2M')).toBeInTheDocument();
    expect(screen.getByText('1h 1m 1s')).toBeInTheDocument();
  });

  it('applies correct styling classes', () => {
    render(<TopStatsPanel metrics={mockDashboardMetrics} loading={false} />);
    
    const container = screen.getByRole('grid');
    expect(container).toHaveClass('MuiGrid-container');
  });

  it('displays icons for each stat', () => {
    render(<TopStatsPanel metrics={mockDashboardMetrics} loading={false} />);
    
    const icons = screen.getAllByTestId(/icon/i);
    expect(icons).toHaveLength(6);
  });

  it('handles zero values correctly', () => {
    const zeroMetrics = {
      ...mockDashboardMetrics,
      activeUsers: 0,
      totalSearches: 0,
      totalBookings: 0,
      conversionRate: 0,
    };
    
    render(<TopStatsPanel metrics={zeroMetrics} loading={false} />);
    
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('updates when metrics prop changes', () => {
    const { rerender } = render(<TopStatsPanel metrics={mockDashboardMetrics} loading={false} />);
    
    expect(screen.getByText('42')).toBeInTheDocument();
    
    const newMetrics = { ...mockDashboardMetrics, activeUsers: 100 };
    rerender(<TopStatsPanel metrics={newMetrics} loading={false} />);
    
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.queryByText('42')).not.toBeInTheDocument();
  });
});