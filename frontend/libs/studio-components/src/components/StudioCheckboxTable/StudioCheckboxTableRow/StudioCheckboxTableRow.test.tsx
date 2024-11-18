import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StudioCheckboxTableRow, type StudioCheckboxTableRowProps } from './StudioCheckboxTableRow';
import { type StudioCheckboxTableRowElement } from '../types/StudioCheckboxTableRowElement';

describe('StudioCheckboxTableRow', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render the checkbox with the correct label and description', () => {
    renderStudioCheckboxTableRow();

    expect(screen.getByRole('checkbox', { name: rowElementMock.label })).toBeInTheDocument();
    expect(screen.getByText(rowElementMock.label)).toBeInTheDocument();
    expect(screen.getByText(rowElementMock.description)).toBeInTheDocument();
  });

  it('should render the checkbox as checked when "checked" is true', () => {
    renderStudioCheckboxTableRow({
      rowElement: { ...rowElementMock, checked: true },
    });

    const checkbox = screen.getByRole('checkbox', { name: rowElementMock.label });
    expect(checkbox).toBeChecked();
  });

  it('should render the checkbox as not checked when "checked" is false', () => {
    renderStudioCheckboxTableRow({
      rowElement: { ...rowElementMock, checked: false },
    });

    const checkbox = screen.getByRole('checkbox', { name: rowElementMock.label });
    expect(checkbox).not.toBeChecked();
  });

  it('should call onChange when the checkbox is clicked', async () => {
    const user = userEvent.setup();
    const mockOnChange = jest.fn();

    renderStudioCheckboxTableRow({
      rowElement: { ...rowElementMock, checked: false },
      onChange: mockOnChange,
    });

    const checkbox = screen.getByRole('checkbox', { name: rowElementMock.label });
    expect(checkbox).not.toBeChecked();
    await user.click(checkbox);

    expect(mockOnChange).toHaveBeenCalledTimes(1);
  });

  it('should render the description when it is provided', () => {
    renderStudioCheckboxTableRow();
    expect(screen.getByText(rowElementMock.description)).toBeInTheDocument();
  });

  it('should not render the description when it is not provided', () => {
    const rowElementWithoutDescription = {
      ...rowElementMock,
      description: undefined,
    };

    renderStudioCheckboxTableRow({
      rowElement: rowElementWithoutDescription,
    });

    expect(screen.queryByText(rowElementMock.description)).not.toBeInTheDocument();
  });
});

const rowElementMock: StudioCheckboxTableRowElement = {
  value: 'test-value',
  label: 'Test Label',
  description: 'Test Description',
  checked: false,
};

const defaultProps: StudioCheckboxTableRowProps = {
  rowElement: rowElementMock,
  onChange: jest.fn(),
};

const renderStudioCheckboxTableRow = (props: Partial<StudioCheckboxTableRowProps> = {}) => {
  render(
    <table>
      <tbody>
        <StudioCheckboxTableRow {...defaultProps} {...props} />
      </tbody>
    </table>,
  );
};
