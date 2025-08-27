import React from 'react';
import type { ReactElement } from 'react';
import { render, screen } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StudioCheckboxTable, useStudioCheckboxTable } from './index';
import type { StudioCheckboxTableProps } from './StudioCheckboxTable';
import type { StudioCheckboxTableHeadProps } from './StudioCheckboxTableHead';

const mockCheckboxTitle: string = 'Checkbox title';
const value1: string = 'Option 1';
const value2: string = 'Option 2';
const value3: string = 'Option 3';
const description1: string = 'Description 1';

type Option = {
  value: string;
  description?: string;
};
const option1: Option = { value: value1 };
const option2: Option = { value: value2 };
const option3: Option = { value: value3 };

const initialSelectedValues: string[] = [value1, value2];
const allOptionsMock: Option[] = [option1, option2, option3];

const mockErrorMessage: string = 'Validation error';

describe('StudioCheckboxTable', () => {
  it('renders table with checkboxes and labels', () => {
    renderCheckboxTable();

    expect(getCheckbox(mockCheckboxTitle)).toBeInTheDocument();
    expect(getCheckbox(value1)).toBeInTheDocument();
    expect(getCheckbox(value2)).toBeInTheDocument();
    expect(getCheckbox(value3)).toBeInTheDocument();
  });

  it('renders the correct "checked" state for the checkboxes', async () => {
    renderCheckboxTable();
    expect(getCheckbox(mockCheckboxTitle)).not.toBeChecked();
    expect(getCheckbox(value1)).toBeChecked();
    expect(getCheckbox(value2)).toBeChecked();
    expect(getCheckbox(value3)).not.toBeChecked();
  });

  it('should not have aria-invalid when hasError is false and some elements are checked', () => {
    renderCheckboxTable();
    expect(getCheckbox(mockCheckboxTitle)).not.toHaveAttribute('aria-invalid', 'true');
    expect(getCheckbox(value1)).not.toHaveAttribute('aria-invalid', 'true');
    expect(getCheckbox(value2)).not.toHaveAttribute('aria-invalid', 'true');
    expect(getCheckbox(value3)).not.toHaveAttribute('aria-invalid', 'true');
  });

  it('should have aria-invalid when hasError is true and all elements are unchecked', () => {
    renderCheckboxTable({ componentProps: { hasError: true }, initialValues: [] });
    expect(getCheckbox(mockCheckboxTitle)).toHaveAttribute('aria-invalid', 'true');
    expect(getCheckbox(value1)).toHaveAttribute('aria-invalid', 'true');
    expect(getCheckbox(value2)).toHaveAttribute('aria-invalid', 'true');
    expect(getCheckbox(value3)).toHaveAttribute('aria-invalid', 'true');
  });

  it('shows error message if hasError is true', () => {
    renderCheckboxTable({ componentProps: { hasError: true, errorMessage: mockErrorMessage } });
    expect(screen.getByText(mockErrorMessage)).toBeInTheDocument();
  });

  it('toggles checkboxes on user interaction', async () => {
    const user = userEvent.setup();
    renderCheckboxTable();
    const checkbox1 = getCheckbox(value1);
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
    expect(getCheckbox(value1)).toBeChecked();
    expect(getCheckbox(value2)).toBeChecked();
    expect(getCheckbox(value3)).toBeChecked();
  });

  it('unchecks all checkboxes when the "all" checkbox is unchecked', async () => {
    const user = userEvent.setup();
    renderCheckboxTable({ componentProps: { errorMessage: mockErrorMessage } });
    expect(screen.queryByText(mockErrorMessage)).not.toBeInTheDocument();
    const allCheckbox = getCheckbox(mockCheckboxTitle);
    await user.click(allCheckbox);
    await user.click(allCheckbox);
    expect(allCheckbox).not.toBeChecked();
    expect(getCheckbox(value1)).not.toBeChecked();
    expect(getCheckbox(value2)).not.toBeChecked();
    expect(getCheckbox(value3)).not.toBeChecked();
    expect(screen.getByText(mockErrorMessage)).toBeInTheDocument();
  });

  it('does not show error message if hasError is false', () => {
    renderCheckboxTable({ componentProps: { errorMessage: mockErrorMessage } });
    expect(screen.queryByText(mockErrorMessage)).not.toBeInTheDocument();
  });

  it('shows description for checkbox when it is provided', () => {
    const descriptionCellTitle: string = 'Description';
    renderCheckboxTable({
      headerProps: { descriptionCellTitle },
      allOptions: [{ ...option1, description: description1 }, option2, option3],
    });

    expect(screen.getByRole('cell', { name: description1 })).toBeInTheDocument();
  });
});

type Props = {
  componentProps?: Partial<StudioCheckboxTableProps>;
  headerProps?: Partial<StudioCheckboxTableHeadProps>;
  initialValues?: string[];
  allOptions?: Option[];
  requiredNumberOfCheckedOptions?: number;
};

function renderCheckboxTable(props?: Partial<Props>): RenderResult {
  const { componentProps, headerProps, initialValues, allOptions, requiredNumberOfCheckedOptions } =
    props || {};

  const Component = (): ReactElement => {
    const { hasError, getCheckboxProps } = useStudioCheckboxTable(
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
          {...headerProps}
        />
        <StudioCheckboxTable.Body>
          {(allOptions ?? allOptionsMock).map((row: Option) => (
            <StudioCheckboxTable.Row
              key={row.value}
              label={row.value}
              description={row.description}
              getCheckboxProps={{
                ...getCheckboxProps({
                  value: row.value,
                  name: row.value,
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
