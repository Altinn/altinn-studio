import React from 'react';
import type { ReactElement } from 'react';
import { render, screen } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StudioCheckboxTable, useStudioCheckboxTableLogic } from './';
import type { StudioCheckboxTableProps } from './StudioCheckboxTable';

const mockCheckboxTitle: string = 'Checkbox title';
const option1: string = 'Option 1';
const option2: string = 'Option 2';
const option3: string = 'Option 3';

const initialSelectedValues: string[] = [option1, option2];
const allOptions: string[] = [option1, option2, option3];

const mockErrorMessage: string = 'Validation error';

describe('StudioCheckboxTable', () => {
  it('renders table with checkboxes and labels', () => {
    renderCheckboxTable();

    expect(getCheckbox(mockCheckboxTitle)).toBeInTheDocument();
    expect(getCheckbox(option1)).toBeInTheDocument();
    expect(getCheckbox(option2)).toBeInTheDocument();
    expect(getCheckbox(option3)).toBeInTheDocument();
  });

  it('renders the correct "checked" state for the checkboxes', async () => {
    renderCheckboxTable();
    expect(getCheckbox(mockCheckboxTitle)).not.toBeChecked();
    expect(getCheckbox(option1)).toBeChecked();
    expect(getCheckbox(option2)).toBeChecked();
    expect(getCheckbox(option3)).not.toBeChecked();
  });

  it('should not have aria-invalid when hasError is false and some elements are checked', () => {
    renderCheckboxTable();
    expect(getCheckbox(mockCheckboxTitle)).not.toHaveAttribute('aria-invalid', 'true');
    expect(getCheckbox(option1)).not.toHaveAttribute('aria-invalid', 'true');
    expect(getCheckbox(option2)).not.toHaveAttribute('aria-invalid', 'true');
    expect(getCheckbox(option3)).not.toHaveAttribute('aria-invalid', 'true');
  });

  it('should have aria-invalid when hasError is trye and all elements are unchecked', () => {
    renderCheckboxTable({ componentProps: { hasError: true }, initialValues: [] });
    expect(getCheckbox(mockCheckboxTitle)).toHaveAttribute('aria-invalid', 'true');
    expect(getCheckbox(option1)).toHaveAttribute('aria-invalid', 'true');
    expect(getCheckbox(option2)).toHaveAttribute('aria-invalid', 'true');
    expect(getCheckbox(option3)).toHaveAttribute('aria-invalid', 'true');
  });

  it('shows error message if hasError is true', () => {
    renderCheckboxTable({ componentProps: { hasError: true, errorMessage: mockErrorMessage } });
    expect(screen.getByText(mockErrorMessage)).toBeInTheDocument();
  });

  it('toggles checkboxes on user interaction', async () => {
    const user = userEvent.setup();
    renderCheckboxTable();
    const checkbox1 = getCheckbox(option1);
    expect(checkbox1).toBeChecked();
    await user.click(checkbox1);
    expect(checkbox1).not.toBeChecked();
  });

  it('checks all checkboxes when the "all" checkbox is checked', async () => {
    const user = userEvent.setup();
    renderCheckboxTable();
    const allCheckbox = getCheckbox(mockCheckboxTitle);
    expect(allCheckbox).not.toBeChecked();
    await user.click(allCheckbox);
    expect(allCheckbox).toBeChecked();
    expect(getCheckbox(option1)).toBeChecked();
    expect(getCheckbox(option2)).toBeChecked();
    expect(getCheckbox(option3)).toBeChecked();
  });

  it('unchecks all checkboxes when the "all" checkbox is unchecked', async () => {
    const user = userEvent.setup();
    renderCheckboxTable({ componentProps: { errorMessage: mockErrorMessage } });
    expect(screen.queryByText(mockErrorMessage)).not.toBeInTheDocument();
    const allCheckbox = getCheckbox(mockCheckboxTitle);
    await user.click(allCheckbox);
    await user.click(allCheckbox);
    expect(allCheckbox).not.toBeChecked();
    expect(getCheckbox(option1)).not.toBeChecked();
    expect(getCheckbox(option2)).not.toBeChecked();
    expect(getCheckbox(option3)).not.toBeChecked();
    expect(screen.getByText(mockErrorMessage)).toBeInTheDocument();
  });
});

type Props = {
  componentProps?: Partial<StudioCheckboxTableProps>;
  initialValues: string[];
  requiredNumberOfCheckedOptions?: number;
};

function renderCheckboxTable(props?: Partial<Props>): RenderResult {
  const { componentProps, initialValues, requiredNumberOfCheckedOptions } = props || {};

  const Component = (): ReactElement => {
    const { hasError, getCheckboxProps } = useStudioCheckboxTableLogic(
      initialValues ?? initialSelectedValues,
      mockCheckboxTitle,
      requiredNumberOfCheckedOptions ?? 1,
    );

    return (
      <StudioCheckboxTable hasError={hasError} {...componentProps}>
        <StudioCheckboxTable.Head
          title={mockCheckboxTitle}
          getCheckboxProps={{
            ...getCheckboxProps({
              allowIndeterminate: true,
              value: 'all',
            }),
          }}
        />
        <StudioCheckboxTable.Body>
          {allOptions.map((row: string) => (
            <StudioCheckboxTable.Row
              key={row}
              label={row}
              getCheckboxProps={{
                ...getCheckboxProps({
                  value: row,
                  name: row,
                }),
              }}
            />
          ))}
        </StudioCheckboxTable.Body>
      </StudioCheckboxTable>
    );
  };

  return render(<Component />);
}

const getCheckbox = (name: string): HTMLInputElement => screen.getByRole('checkbox', { name });
