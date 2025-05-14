import React from 'react';
import { render, screen } from '@testing-library/react';
import { type RenderResult } from '@testing-library/react';
import { StudioCheckboxTableRow } from './StudioCheckboxTableRow';
import type { StudioCheckboxTableRowProps } from './StudioCheckboxTableRow';
import { defaultStudioCheckboxContextProps, mockGetCheckboxProps, option1 } from '../mocks';
import { StudioCheckboxTableContextProvider } from '../StudioCheckboxTableContext';
import type { StudioCheckboxTableContextProps } from '../StudioCheckboxTableContext';

describe('StudioCheckboxTableRow', () => {
  it('renders a checkbox with the correct aria-label and value', () => {
    renderStudioCheckboxTableRow();
    const checkbox = screen.getByRole('checkbox', { name: option1.label });
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).toHaveAttribute('value', option1.value);
    expect(checkbox).toHaveAttribute('aria-invalid', 'false');
    expect(checkbox).toHaveAttribute('aria-label', option1.label);
  });

  it('sets aria-invalid to true when context hasError is true', () => {
    renderStudioCheckboxTableRow({ providerProps: { hasError: true } });

    const checkbox = screen.getByRole('checkbox', { name: option1.label });
    expect(checkbox).toHaveAttribute('aria-invalid', 'true');
  });
});

const defaultProps: StudioCheckboxTableRowProps = {
  label: option1.label,
  getCheckboxProps: { ...mockGetCheckboxProps, checked: option1.checked, value: option1.value },
};

type Props = {
  componentProps?: Partial<StudioCheckboxTableRowProps>;
  providerProps?: Partial<StudioCheckboxTableContextProps>;
};

function renderStudioCheckboxTableRow(props: Partial<Props> = {}): RenderResult {
  const { componentProps, providerProps } = props;
  return render(
    <StudioCheckboxTableContextProvider {...defaultStudioCheckboxContextProps} {...providerProps}>
      <table>
        <tbody>
          <StudioCheckboxTableRow {...defaultProps} {...componentProps} />
        </tbody>
      </table>
    </StudioCheckboxTableContextProvider>,
  );
}
