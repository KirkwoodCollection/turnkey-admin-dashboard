import { render, screen, fireEvent } from '../../setup/testUtils';
import { AlertBanner } from '../../../src/components/AlertBanner';

describe('AlertBanner', () => {
  it('renders success alert correctly', () => {
    render(<AlertBanner type="success" message="Operation successful" />);
    
    expect(screen.getByText('Operation successful')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveClass('MuiAlert-colorSuccess');
  });

  it('renders error alert correctly', () => {
    render(<AlertBanner type="error" message="Something went wrong" />);
    
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveClass('MuiAlert-colorError');
  });

  it('renders warning alert correctly', () => {
    render(<AlertBanner type="warning" message="This is a warning" />);
    
    expect(screen.getByText('This is a warning')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveClass('MuiAlert-colorWarning');
  });

  it('renders info alert correctly', () => {
    render(<AlertBanner type="info" message="Information message" />);
    
    expect(screen.getByText('Information message')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveClass('MuiAlert-colorInfo');
  });

  it('shows close button when closeable', () => {
    const onClose = jest.fn();
    render(<AlertBanner type="info" message="Test message" onClose={onClose} />);
    
    const closeButton = screen.getByLabelText('Close');
    expect(closeButton).toBeInTheDocument();
  });

  it('calls onClose when close button clicked', () => {
    const onClose = jest.fn();
    render(<AlertBanner type="info" message="Test message" onClose={onClose} />);
    
    const closeButton = screen.getByLabelText('Close');
    fireEvent.click(closeButton);
    
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not show close button when not closeable', () => {
    render(<AlertBanner type="info" message="Test message" />);
    
    const closeButton = screen.queryByLabelText('Close');
    expect(closeButton).not.toBeInTheDocument();
  });

  it('displays custom title when provided', () => {
    render(<AlertBanner type="error" title="Error Title" message="Error message" />);
    
    expect(screen.getByText('Error Title')).toBeInTheDocument();
    expect(screen.getByText('Error message')).toBeInTheDocument();
  });

  it('renders with custom action buttons', () => {
    const handleAction = jest.fn();
    render(
      <AlertBanner 
        type="warning" 
        message="Warning message" 
        action={
          <button onClick={handleAction}>Take Action</button>
        }
      />
    );
    
    const actionButton = screen.getByText('Take Action');
    expect(actionButton).toBeInTheDocument();
    
    fireEvent.click(actionButton);
    expect(handleAction).toHaveBeenCalledTimes(1);
  });

  it('applies custom className when provided', () => {
    render(<AlertBanner type="info" message="Test" className="custom-alert" />);
    
    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('custom-alert');
  });

  it('handles multiline messages correctly', () => {
    const multilineMessage = "Line 1\nLine 2\nLine 3";
    render(<AlertBanner type="info" message={multilineMessage} />);
    
    expect(screen.getByText(/Line 1/)).toBeInTheDocument();
  });

  it('displays appropriate icons for different types', () => {
    const { rerender } = render(<AlertBanner type="success" message="Success" />);
    expect(screen.getByTestId('SuccessOutlinedIcon')).toBeInTheDocument();
    
    rerender(<AlertBanner type="error" message="Error" />);
    expect(screen.getByTestId('ReportProblemOutlinedIcon')).toBeInTheDocument();
    
    rerender(<AlertBanner type="warning" message="Warning" />);
    expect(screen.getByTestId('ReportProblemOutlinedIcon')).toBeInTheDocument();
    
    rerender(<AlertBanner type="info" message="Info" />);
    expect(screen.getByTestId('InfoOutlinedIcon')).toBeInTheDocument();
  });

  it('handles empty message gracefully', () => {
    render(<AlertBanner type="info" message="" />);
    
    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
  });

  it('supports HTML content in message', () => {
    render(<AlertBanner type="info" message={<span>HTML <strong>content</strong></span>} />);
    
    expect(screen.getByText('HTML')).toBeInTheDocument();
    expect(screen.getByText('content')).toBeInTheDocument();
  });

  it('auto-dismisses when timeout is set', () => {
    jest.useFakeTimers();
    const onClose = jest.fn();
    
    render(<AlertBanner type="info" message="Test" onClose={onClose} timeout={3000} />);
    
    // Fast-forward time
    jest.advanceTimersByTime(3000);
    
    expect(onClose).toHaveBeenCalledTimes(1);
    
    jest.useRealTimers();
  });

  it('cancels auto-dismiss when component unmounts', () => {
    jest.useFakeTimers();
    const onClose = jest.fn();
    
    const { unmount } = render(
      <AlertBanner type="info" message="Test" onClose={onClose} timeout={3000} />
    );
    
    unmount();
    
    // Fast-forward time
    jest.advanceTimersByTime(3000);
    
    expect(onClose).not.toHaveBeenCalled();
    
    jest.useRealTimers();
  });
});