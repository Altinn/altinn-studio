import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  StudioCheckboxTableHeader,
  type StudioCheckboxTableHeaderProps,
} from './StudioCheckboxTableHeader';

describe('StudioCheckboxTableHeader', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render the checkbox with the correct label and state', () => {
    renderStudioCheckboxTableHeader();

    const checkbox = screen.getByRole('checkbox', { name: titleMock });
    expect(checkbox).toBeInTheDocument();
  });

  it('should render the checkbox as checked when "checked" is true', () => {
    renderStudioCheckboxTableHeader({ checked: true });

    const checkbox = screen.getByRole('checkbox', { name: titleMock });
    expect(checkbox).toBeChecked();
  });

  it('should render the checkbox as not checked when "checked" is false', () => {
    renderStudioCheckboxTableHeader({ checked: false });

    const checkbox = screen.getByRole('checkbox', { name: titleMock });
    expect(checkbox).not.toBeChecked();
  });

  it('should render the title as a separate header cell', () => {
    renderStudioCheckboxTableHeader();

    const headerCell = screen.getByText(titleMock);
    expect(headerCell).toBeInTheDocument();
    expect(headerCell).toHaveAttribute('aria-hidden', 'true');
  });

  it('should call onChange when the checkbox is clicked', async () => {
    const user = userEvent.setup();
    const mockOnChange = jest.fn();
    renderStudioCheckboxTableHeader({ checked: false, onChange: mockOnChange });

    const checkbox = screen.getByRole('checkbox', { name: titleMock });
    expect(checkbox).not.toBeChecked();
    await user.click(checkbox);

    expect(mockOnChange).toHaveBeenCalledTimes(1);
  });
});

const titleMock: string = 'Title';

const defaultProps: StudioCheckboxTableHeaderProps = {
  title: titleMock,
  checked: false,
  indeterminate: false,
  onChange: jest.fn(),
};

const renderStudioCheckboxTableHeader = (props: Partial<StudioCheckboxTableHeaderProps> = {}) => {
  render(
    <table>
      <StudioCheckboxTableHeader {...defaultProps} {...props} />
    </table>,
  );
};
