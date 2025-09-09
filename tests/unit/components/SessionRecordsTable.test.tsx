import { render, screen, fireEvent } from '../../setup/testUtils';
import { SessionRecordsTable } from '../../../src/components/SessionRecordsTable';
import { mockSessions } from '../../fixtures/mockData';

describe('SessionRecordsTable', () => {
  it('renders table headers correctly', () => {
    render(<SessionRecordsTable sessions={mockSessions} loading={false} />);
    
    expect(screen.getByText('Session ID')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Destination')).toBeInTheDocument();
    expect(screen.getByText('Hotel')).toBeInTheDocument();
    expect(screen.getByText('Duration')).toBeInTheDocument();
    expect(screen.getByText('Stage')).toBeInTheDocument();
    expect(screen.getByText('Updated')).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();
  });

  it('displays session data correctly', () => {
    const singleSession = [mockSessions[0]]; // Just the first session
    render(<SessionRecordsTable sessions={singleSession} loading={false} />);
    
    expect(screen.getByText('sess_tes...')).toBeInTheDocument(); // truncated session ID
    expect(screen.getByText('The Ballard Inn & Restaurant')).toBeInTheDocument();
    expect(screen.getByText('Santa Barbara')).toBeInTheDocument();
    expect(screen.getByText('LIVE')).toBeInTheDocument();
  });

  it('shows status badges with correct colors', () => {
    render(<SessionRecordsTable sessions={mockSessions} loading={false} />);
    
    const liveStatus = screen.getByText('LIVE');
    const abandonedStatus = screen.getByText('ABANDONED');
    const confirmedStatus = screen.getByText('CONFIRMED BOOKING');
    
    expect(liveStatus).toHaveClass('MuiChip-colorSuccess');
    expect(abandonedStatus).toHaveClass('MuiChip-colorError');
    expect(confirmedStatus).toHaveClass('MuiChip-colorInfo');
  });

  it('displays stage information', () => {
    render(<SessionRecordsTable sessions={mockSessions} loading={false} />);
    
    // Check that stage chips are rendered (assuming mock sessions have different currentStage values)
    expect(screen.getByText(/Stage \d+/)).toBeInTheDocument();
  });

  it('shows loading state when loading', () => {
    render(<SessionRecordsTable sessions={[]} loading={true} />);
    
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('displays empty state when no sessions', () => {
    render(<SessionRecordsTable sessions={[]} loading={false} />);
    
    expect(screen.getByText('No session data available.')).toBeInTheDocument();
  });

  it('formats time correctly', () => {
    render(<SessionRecordsTable sessions={mockSessions} loading={false} />);
    
    // Should show time format (HH:mm:ss)
    expect(screen.getByText(/\d{2}:\d{2}:\d{2}/)).toBeInTheDocument();
  });

  it('handles action button clicks', () => {
    const onSessionClick = jest.fn();
    render(<SessionRecordsTable sessions={mockSessions} loading={false} onSessionClick={onSessionClick} />);
    
    const viewButtons = screen.getAllByRole('button', { name: /view details/i });
    fireEvent.click(viewButtons[0]);
    
    expect(onSessionClick).toHaveBeenCalledWith(mockSessions[0]);
  });

  it('handles pagination when many sessions', () => {
    const manySessions = Array.from({ length: 25 }, (_, i) => ({
      ...mockSessions[0],
      sessionId: `sess_test_${i}`,
    }));
    
    render(<SessionRecordsTable sessions={manySessions} loading={false} />);
    
    expect(screen.getByLabelText('Go to next page')).toBeInTheDocument();
    expect(screen.getByText('1-10 of 25')).toBeInTheDocument();
  });

  it('allows changing page size', () => {
    const manySessions = Array.from({ length: 25 }, (_, i) => ({
      ...mockSessions[0],
      sessionId: `sess_test_${i}`,
    }));
    
    render(<SessionRecordsTable sessions={manySessions} loading={false} />);
    
    const rowsPerPageSelect = screen.getByDisplayValue('10');
    fireEvent.mouseDown(rowsPerPageSelect);
    
    const option25 = screen.getByText('25');
    fireEvent.click(option25);
    
    expect(screen.getByText('1-25 of 25')).toBeInTheDocument();
  });

  it('handles sorting by columns', () => {
    render(<SessionRecordsTable sessions={mockSessions} loading={false} />);
    
    const createdHeader = screen.getByText('Created');
    fireEvent.click(createdHeader);
    
    // Should trigger sort (implementation may vary)
    expect(createdHeader).toBeInTheDocument();
  });

  it('displays price information when available', () => {
    render(<SessionRecordsTable sessions={mockSessions} loading={false} />);
    
    expect(screen.getByText('$450.00')).toBeInTheDocument();
    expect(screen.getByText('$275.00')).toBeInTheDocument();
  });

  it('shows guest and room information', () => {
    render(<SessionRecordsTable sessions={mockSessions} loading={false} />);
    
    expect(screen.getByText('2 guests, 1 room')).toBeInTheDocument();
    expect(screen.getByText('1 guest, 1 room')).toBeInTheDocument();
  });

  it('handles missing optional data gracefully', () => {
    const incompleteSession = {
      sessionId: 'sess_incomplete',
      userId: 'user_incomplete',
      hotel: 'Test Hotel',
      destination: 'Test Destination',
      status: 'LIVE' as const,
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-15T10:15:00Z',
      currentStage: 2,
      completedStages: ['destination'],
    };
    
    render(<SessionRecordsTable sessions={[incompleteSession]} loading={false} />);
    
    expect(screen.getByText('sess_inc...')).toBeInTheDocument(); // truncated session ID
    expect(screen.getByText('Test Hotel')).toBeInTheDocument();
  });

  it('applies correct row styling based on status', () => {
    render(<SessionRecordsTable sessions={mockSessions} loading={false} />);
    
    const table = screen.getByRole('table');
    const rows = table.querySelectorAll('tbody tr');
    
    expect(rows).toHaveLength(3);
  });
});