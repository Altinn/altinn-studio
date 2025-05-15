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

const options: StudioCheckboxTableRowElement[] = [option1, option2, checkedOption];

describe('StudioCheckboxTable', () => {
  it('renders table with checkboxes and labels', () => {
    renderCheckboxTable();

    expect(getCheckbox(mockCheckboxTitle)).toBeInTheDocument();
    expect(getCheckbox(option1.label)).toBeInTheDocument();
    expect(getCheckbox(option2.label)).toBeInTheDocument();
    expect(getCheckbox(checkedOption.label)).toBeInTheDocument();
  });

  it('renders the correct "checked" state for the checkboxes', () => {
    renderCheckboxTable();

    screen.debug();

    // expect(getCheckbox(mockCheckboxTitle)).toBeChecked();
    expect(getCheckbox(option1.label)).toBeChecked();
    expect(getCheckbox(option2.label)).toBeChecked();
    expect(getCheckbox(checkedOption.label)).not.toBeChecked();
  });

  /*
  it('shows error message if hasError is true', () => {
    renderCheckboxTable();
    expect(screen.getByText('Validation error')).toBeInTheDocument();
  });

  it('toggles checkboxes on user interaction', async () => {
    renderCheckboxTable();
    const user = userEvent.setup();

    const option1 = screen.getByLabelText('Option 1') as HTMLInputElement;
    expect(option1.checked).toBe(false);

    await user.click(option1);
    // Note: logic updates won't reflect in original component due to separate logic per render,
    // so this test focuses only on interaction, not state update validation.
    expect(option1.checked).toBe(true);
  });*/
});

function renderCheckboxTable(props?: Partial<StudioCheckboxTableProps>): RenderResult {
  const Component = (): ReactElement => {
    const { hasError, rowElements, getCheckboxProps, handleCheckboxChange } =
      useStudioCheckboxTableLogic(options, mockCheckboxTitle);

    return (
      <StudioCheckboxTable hasError={hasError} errorMessage='Validation error' {...props}>
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
