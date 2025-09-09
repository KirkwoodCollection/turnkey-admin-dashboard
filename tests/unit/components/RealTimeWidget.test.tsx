import { render, screen } from '../../setup/testUtils';
import { RealTimeWidget } from '../../../src/components/RealTimeWidget';

describe('RealTimeWidget', () => {
  it('renders title correctly', () => {
    render(<RealTimeWidget title="Test Widget" />);
    
    expect(screen.getByText('Test Widget')).toBeInTheDocument();
  });

  it('displays connection status indicator', () => {
    render(<RealTimeWidget title="Test Widget" connected={true} />);
    
    const indicator = screen.getByTestId('connection-indicator');
    expect(indicator).toBeInTheDocument();
    expect(indicator).toHaveClass('connected');
  });

  it('shows disconnected state', () => {
    render(<RealTimeWidget title="Test Widget" connected={false} />);
    
    const indicator = screen.getByTestId('connection-indicator');
    expect(indicator).toHaveClass('disconnected');
  });

  it('renders children content', () => {
    render(
      <RealTimeWidget title="Test Widget">
        <div>Child content</div>
      </RealTimeWidget>
    );
    
    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  it('displays last updated timestamp when provided', () => {
    const lastUpdated = new Date('2024-01-15T10:30:00Z');
    render(<RealTimeWidget title="Test Widget" lastUpdated={lastUpdated} />);
    
    expect(screen.getByText(/Last updated/)).toBeInTheDocument();
  });

  it('shows live indicator when connected', () => {
    render(<RealTimeWidget title="Test Widget" connected={true} />);
    
    expect(screen.getByText('LIVE')).toBeInTheDocument();
  });

  it('shows offline indicator when disconnected', () => {
    render(<RealTimeWidget title="Test Widget" connected={false} />);
    
    expect(screen.getByText('OFFLINE')).toBeInTheDocument();
  });

  it('applies correct styling classes', () => {
    render(<RealTimeWidget title="Test Widget" />);
    
    const widget = screen.getByTestId('realtime-widget');
    expect(widget).toHaveClass('MuiPaper-root');
  });

  it('displays loading state when specified', () => {
    render(<RealTimeWidget title="Test Widget" loading={true} />);
    
    expect(screen.getByTestId('widget-loading')).toBeInTheDocument();
  });

  it('handles error state', () => {
    render(<RealTimeWidget title="Test Widget" error="Connection failed" />);
    
    expect(screen.getByText('Connection failed')).toBeInTheDocument();
  });

  it('displays refresh button', () => {
    const onRefresh = jest.fn();
    render(<RealTimeWidget title="Test Widget" onRefresh={onRefresh} />);
    
    const refreshButton = screen.getByLabelText('Refresh');
    expect(refreshButton).toBeInTheDocument();
  });

  it('calls refresh callback when refresh button clicked', () => {
    const onRefresh = jest.fn();
    render(<RealTimeWidget title="Test Widget" onRefresh={onRefresh} />);
    
    const refreshButton = screen.getByLabelText('Refresh');
    refreshButton.click();
    
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('shows tooltip on connection indicator', () => {
    render(<RealTimeWidget title="Test Widget" connected={true} />);
    
    const indicator = screen.getByTestId('connection-indicator');
    expect(indicator).toHaveAttribute('title', 'Connected to live data stream');
  });

  it('formats last updated time correctly', () => {
    const lastUpdated = new Date();
    render(<RealTimeWidget title="Test Widget" lastUpdated={lastUpdated} />);
    
    expect(screen.getByText(/just now|seconds ago|minute ago|minutes ago/)).toBeInTheDocument();
  });

  it('handles pulse animation for live updates', () => {
    render(<RealTimeWidget title="Test Widget" connected={true} pulse={true} />);
    
    const widget = screen.getByTestId('realtime-widget');
    expect(widget).toHaveClass('pulse-animation');
  });

  it('displays data freshness indicator', () => {
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    render(<RealTimeWidget title="Test Widget" lastUpdated={twoMinutesAgo} />);
    
    expect(screen.getByText('2 minutes ago')).toBeInTheDocument();
  });

  it('applies custom className when provided', () => {
    render(<RealTimeWidget title="Test Widget" className="custom-widget" />);
    
    const widget = screen.getByTestId('realtime-widget');
    expect(widget).toHaveClass('custom-widget');
  });
});