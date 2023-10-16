import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { SwitchRow, SwitchRowProps } from './SwitchRow';
import userEvent from '@testing-library/user-event';

const mockLabel: string = 'Test Switch';
const mockChecked: boolean = true;
const mockOnSave = jest.fn();

const defaultProps: SwitchRowProps = {
  label: mockLabel,
  checked: mockChecked,
  onSave: mockOnSave,
};

describe('SwitchRow', () => {
  afterEach(jest.clearAllMocks);

  it('renders with the correct label and initial checked state', () => {
    render(<SwitchRow {...defaultProps} />);

    const input = screen.getByLabelText(mockLabel);
    expect(input).toBeChecked();
  });

  it('calls "onSave" with the correct value when the switch is toggled', async () => {
    const user = userEvent.setup();
    render(<SwitchRow {...defaultProps} />);

    const input = screen.getByLabelText(mockLabel);

    await act(() => user.click(input));

    expect(mockOnSave).toHaveBeenCalledWith(!mockChecked);
    expect(mockOnSave).toHaveBeenCalledTimes(1);
  });
});
