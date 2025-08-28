import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StudioCheckboxTableRow, type StudioCheckboxTableRowProps } from './StudioCheckboxTableRow';
import { rowElementMock1 } from '../mocks';

describe('StudioCheckboxTableRow', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render the checkbox with the correct label and description', () => {
    renderStudioCheckboxTableRow();

    expect(screen.getByRole('checkbox', { name: rowElementMock1.label })).toBeInTheDocument();
    expect(screen.getByText(rowElementMock1.label)).toBeInTheDocument();
    expect(screen.getByText(rowElementMock1.description)).toBeInTheDocument();
  });

  it('should render the checkbox as checked when "checked" is true', () => {
    renderStudioCheckboxTableRow({
      rowElement: { ...rowElementMock1, checked: true },
    });

    const checkbox = screen.getByRole('checkbox', { name: rowElementMock1.label });
    expect(checkbox).toBeChecked();
  });

  it('should render the checkbox as not checked when "checked" is false', () => {
    renderStudioCheckboxTableRow({
      rowElement: { ...rowElementMock1, checked: false },
    });

    const checkbox = screen.getByRole('checkbox', { name: rowElementMock1.label });
    expect(checkbox).not.toBeChecked();
  });

  it('should call onChange when the checkbox is clicked', async () => {
    const user = userEvent.setup();
    const mockOnChange = jest.fn();

    renderStudioCheckboxTableRow({
      rowElement: { ...rowElementMock1, checked: false },
      onChange: mockOnChange,
    });

    const checkbox = screen.getByRole('checkbox', { name: rowElementMock1.label });
    expect(checkbox).not.toBeChecked();
    await user.click(checkbox);

    expect(mockOnChange).toHaveBeenCalledTimes(1);
  });

  it('should render the description when it is provided', () => {
    renderStudioCheckboxTableRow();
    expect(screen.getByText(rowElementMock1.description)).toBeInTheDocument();
  });

  it('should not render the description when it is not provided', () => {
    const rowElementWithoutDescription = {
      ...rowElementMock1,
      description: undefined,
    };

    renderStudioCheckboxTableRow({
      rowElement: rowElementWithoutDescription,
    });

    expect(screen.queryByText(rowElementMock1.description)).not.toBeInTheDocument();
  });
});

const defaultProps: StudioCheckboxTableRowProps = {
  rowElement: rowElementMock1,
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
