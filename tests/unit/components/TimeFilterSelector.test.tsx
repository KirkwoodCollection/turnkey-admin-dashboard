import { render, screen, fireEvent } from '../../setup/testUtils';
import { TimeFilterSelector } from '../../../src/components/TimeFilterSelector';

describe('TimeFilterSelector', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('renders all time filter options', () => {
    render(<TimeFilterSelector value="24h" onChange={mockOnChange} />);
    
    const selector = screen.getByDisplayValue('Last 24 Hours');
    expect(selector).toBeInTheDocument();
  });

  it('displays current selected value', () => {
    render(<TimeFilterSelector value="7d" onChange={mockOnChange} />);
    
    expect(screen.getByDisplayValue('Last 7 Days')).toBeInTheDocument();
  });

  it('calls onChange when selection changes', () => {
    render(<TimeFilterSelector value="24h" onChange={mockOnChange} />);
    
    const selector = screen.getByRole('combobox');
    fireEvent.mouseDown(selector);
    
    const option30d = screen.getByText('Last 30 Days');
    fireEvent.click(option30d);
    
    expect(mockOnChange).toHaveBeenCalledWith('30d');
  });

  it('shows all available time range options', () => {
    render(<TimeFilterSelector value="24h" onChange={mockOnChange} />);
    
    const selector = screen.getByRole('combobox');
    fireEvent.mouseDown(selector);
    
    expect(screen.getByText('Last Hour')).toBeInTheDocument();
    expect(screen.getByText('Last 24 Hours')).toBeInTheDocument();
    expect(screen.getByText('Last 7 Days')).toBeInTheDocument();
    expect(screen.getByText('Last 30 Days')).toBeInTheDocument();
    expect(screen.getByText('Last 90 Days')).toBeInTheDocument();
  });

  it('handles keyboard navigation', () => {
    render(<TimeFilterSelector value="24h" onChange={mockOnChange} />);
    
    const selector = screen.getByRole('combobox');
    
    // Focus the selector
    selector.focus();
    
    // Press Enter to open
    fireEvent.keyDown(selector, { key: 'Enter' });
    
    // Press ArrowDown to navigate
    fireEvent.keyDown(selector, { key: 'ArrowDown' });
    
    // Press Enter to select
    fireEvent.keyDown(selector, { key: 'Enter' });
    
    expect(mockOnChange).toHaveBeenCalled();
  });

  it('applies correct styling classes', () => {
    render(<TimeFilterSelector value="24h" onChange={mockOnChange} />);
    
    const formControl = screen.getByTestId('time-filter-selector');
    expect(formControl).toHaveClass('MuiFormControl-root');
  });

  it('displays helper text when provided', () => {
    render(
      <TimeFilterSelector 
        value="24h" 
        onChange={mockOnChange} 
        helperText="Select time range for analytics"
      />
    );
    
    expect(screen.getByText('Select time range for analytics')).toBeInTheDocument();
  });

  it('handles disabled state', () => {
    render(<TimeFilterSelector value="24h" onChange={mockOnChange} disabled />);
    
    const selector = screen.getByRole('combobox');
    expect(selector).toBeDisabled();
  });

  it('shows loading state when loading', () => {
    render(<TimeFilterSelector value="24h" onChange={mockOnChange} loading />);
    
    expect(screen.getByTestId('time-filter-loading')).toBeInTheDocument();
  });

  it('handles invalid value gracefully', () => {
    render(<TimeFilterSelector value="invalid" onChange={mockOnChange} />);
    
    // Should default to showing the value even if not in options
    const selector = screen.getByRole('combobox');
    expect(selector).toBeInTheDocument();
  });

  it('displays custom time range option', () => {
    render(<TimeFilterSelector value="24h" onChange={mockOnChange} showCustom />);
    
    const selector = screen.getByRole('combobox');
    fireEvent.mouseDown(selector);
    
    expect(screen.getByText('Custom Range')).toBeInTheDocument();
  });

  it('handles custom range selection', () => {
    render(<TimeFilterSelector value="24h" onChange={mockOnChange} showCustom />);
    
    const selector = screen.getByRole('combobox');
    fireEvent.mouseDown(selector);
    
    const customOption = screen.getByText('Custom Range');
    fireEvent.click(customOption);
    
    expect(mockOnChange).toHaveBeenCalledWith('custom');
  });

  it('formats time range labels correctly', () => {
    render(<TimeFilterSelector value="24h" onChange={mockOnChange} />);
    
    const selector = screen.getByRole('combobox');
    fireEvent.mouseDown(selector);
    
    // Check that labels are properly formatted
    expect(screen.getByText('Last Hour')).toBeInTheDocument();
    expect(screen.getByText('Last 24 Hours')).toBeInTheDocument();
    expect(screen.getByText('Last 7 Days')).toBeInTheDocument();
  });

  it('maintains selection state correctly', () => {
    const { rerender } = render(<TimeFilterSelector value="24h" onChange={mockOnChange} />);
    
    expect(screen.getByDisplayValue('Last 24 Hours')).toBeInTheDocument();
    
    rerender(<TimeFilterSelector value="7d" onChange={mockOnChange} />);
    
    expect(screen.getByDisplayValue('Last 7 Days')).toBeInTheDocument();
  });
});