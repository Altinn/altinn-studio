import React from 'react';
import type { ReactElement } from 'react';
import { render, screen } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StudioCheckboxTable } from './';
import type { StudioCheckboxTableProps } from './StudioCheckboxTable';
import type { StudioCheckboxTableRowElement } from './types/StudioCheckboxTableRowElement';
import { checkedOption, mockCheckboxTitle, option1, option2 } from './mocks';
import { useStudioCheckboxTableLogic } from './hook/useStudioCheckboxTableLogic';

const mockOptions: StudioCheckboxTableRowElement[] = [option1, option2, checkedOption];
const mockOptionsAllChecked: StudioCheckboxTableRowElement[] = mockOptions.map(
  (option: StudioCheckboxTableRowElement) => ({
    ...option,
    checked: true,
  }),
);
const mockOptionsAllUnChecked: StudioCheckboxTableRowElement[] = mockOptions.map(
  (option: StudioCheckboxTableRowElement) => ({
    ...option,
    checked: false,
  }),
);
const mockErrorMessage: string = 'Validation error';

describe('StudioCheckboxTable', () => {
  it('renders table with checkboxes and labels', () => {
    renderCheckboxTable();

    expect(getCheckbox(mockCheckboxTitle)).toBeInTheDocument();
    expect(getCheckbox(option1.label)).toBeInTheDocument();
    expect(getCheckbox(option2.label)).toBeInTheDocument();
    expect(getCheckbox(checkedOption.label)).toBeInTheDocument();
  });

  it('renders the correct "checked" state for the checkboxes', async () => {
    renderCheckboxTable();
    expect(getCheckbox(mockCheckboxTitle)).not.toBeChecked();
    expect(getCheckbox(option1.label)).not.toBeChecked();
    expect(getCheckbox(option2.label)).not.toBeChecked();
    expect(getCheckbox(checkedOption.label)).toBeChecked();
  });

  it('should not have aria-invalid when hasError is false and all elements are checked', () => {
    renderCheckboxTable({ options: mockOptionsAllChecked });
    expect(getCheckbox(mockCheckboxTitle)).not.toHaveAttribute('aria-invalid', 'true');
    expect(getCheckbox(option1.label)).not.toHaveAttribute('aria-invalid', 'true');
    expect(getCheckbox(option2.label)).not.toHaveAttribute('aria-invalid', 'true');
    expect(getCheckbox(checkedOption.label)).not.toHaveAttribute('aria-invalid', 'true');
  });

  it('should have aria-invalid when hasError is trye and all elements are unchecked', () => {
    renderCheckboxTable({ componentProps: { hasError: true }, options: mockOptionsAllUnChecked });
    expect(getCheckbox(mockCheckboxTitle)).toHaveAttribute('aria-invalid', 'true');
    expect(getCheckbox(option1.label)).toHaveAttribute('aria-invalid', 'true');
    expect(getCheckbox(option2.label)).toHaveAttribute('aria-invalid', 'true');
    expect(getCheckbox(checkedOption.label)).toHaveAttribute('aria-invalid', 'true');
  });

  it('shows error message if hasError is true', () => {
    renderCheckboxTable({ componentProps: { hasError: true, errorMessage: mockErrorMessage } });
    expect(screen.getByText(mockErrorMessage)).toBeInTheDocument();
  });

  it('toggles checkboxes on user interaction', async () => {
    const user = userEvent.setup();
    renderCheckboxTable();
    const checkbox1 = getCheckbox(option1.label);
    expect(checkbox1).not.toBeChecked();
    await user.click(checkbox1);
    expect(checkbox1).toBeChecked();
  });

  it('checks all checkboxes when the "all" checkbox is checked', async () => {
    const user = userEvent.setup();
    renderCheckboxTable();
    const allCheckbox = getCheckbox(mockCheckboxTitle);
    expect(allCheckbox).not.toBeChecked();
    await user.click(allCheckbox);
    expect(allCheckbox).toBeChecked();
    expect(getCheckbox(option1.label)).toBeChecked();
    expect(getCheckbox(option2.label)).toBeChecked();
    expect(getCheckbox(checkedOption.label)).toBeChecked();
  });

  it('unchecks all checkboxes when the "all" checkbox is unchecked', async () => {
    const user = userEvent.setup();
    renderCheckboxTable({ componentProps: { errorMessage: mockErrorMessage } });
    expect(screen.queryByText(mockErrorMessage)).not.toBeInTheDocument();
    const allCheckbox = getCheckbox(mockCheckboxTitle);
    await user.click(allCheckbox);
    await user.click(allCheckbox);
    expect(allCheckbox).not.toBeChecked();
    expect(getCheckbox(option1.label)).not.toBeChecked();
    expect(getCheckbox(option2.label)).not.toBeChecked();
    expect(getCheckbox(checkedOption.label)).not.toBeChecked();
    expect(screen.getByText(mockErrorMessage)).toBeInTheDocument();
  });
});

type Props = {
  componentProps?: Partial<StudioCheckboxTableProps>;
  options: StudioCheckboxTableRowElement[];
};

function renderCheckboxTable(props?: Partial<Props>): RenderResult {
  const { componentProps, options } = props || {};

  const Component = (): ReactElement => {
    const { hasError, rowElements, getCheckboxProps, handleCheckboxChange } =
      useStudioCheckboxTableLogic(options ?? mockOptions, mockCheckboxTitle);

    return (
      <StudioCheckboxTable hasError={hasError} {...componentProps}>
        <StudioCheckboxTable.Head
          title={mockCheckboxTitle}
          getCheckboxProps={{
            ...getCheckboxProps({
              allowIndeterminate: true,
              value: 'all',
              onChange: handleCheckboxChange,
            }),
          }}
        />
        <StudioCheckboxTable.Body>
          {rowElements.map((row: StudioCheckboxTableRowElement) => (
            <StudioCheckboxTable.Row
              key={row.value}
              label={row.label}
              getCheckboxProps={{
                ...getCheckboxProps({
                  value: row.value,
                  checked: row.checked,
                  name: row.label,
                  onChange: handleCheckboxChange,
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
