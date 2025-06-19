import React from 'react';
import { render, screen } from '@testing-library/react';
import { type RenderResult } from '@testing-library/react';
import { StudioCheckboxTableRow } from './StudioCheckboxTableRow';
import type { StudioCheckboxTableRowProps } from './StudioCheckboxTableRow';
import { StudioCheckboxTableContextProvider } from '../StudioCheckboxTableContext';
import type { StudioCheckboxTableContextProps } from '../StudioCheckboxTableContext';
import type { StudioGetCheckboxProps } from '../types/StudioGetCheckboxProps';
import { CHECKBOX_TABLE_ERROR_ID } from '../constants';

const option1: string = 'Option 1';
const mockGetCheckboxProps: StudioGetCheckboxProps = {
  name: option1,
};
const defaultStudioCheckboxContextProps: StudioCheckboxTableContextProps = {
  hasError: false,
};

describe('StudioCheckboxTableRow', () => {
  it('renders a checkbox with the correct aria-label and value', () => {
    renderStudioCheckboxTableRow();
    const checkbox = screen.getByRole('checkbox', { name: option1 });
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).toHaveAttribute('value', option1);
    expect(checkbox).toHaveAttribute('aria-invalid', 'false');
    expect(checkbox).toHaveAttribute('aria-label', option1);
  });

  it('sets aria-invalid to true when context hasError is true', () => {
    renderStudioCheckboxTableRow({ providerProps: { hasError: true } });

    const checkbox = screen.getByRole('checkbox', { name: option1 });
    expect(checkbox).toHaveAttribute('aria-invalid', 'true');
  });

  it('sets aria-describedby to the error id when hasError is true', () => {
    renderStudioCheckboxTableRow({
      providerProps: { hasError: true },
    });

    const checkbox = screen.getByRole('checkbox', { name: option1 });
    expect(checkbox).toHaveAttribute('aria-describedby', CHECKBOX_TABLE_ERROR_ID);
  });

  it('renders the label in the cell', () => {
    renderStudioCheckboxTableRow();
    const labelCell = screen.getByRole('cell', { name: option1 });
    expect(labelCell).toBeInTheDocument();
  });

  it('renders the description in the cell when provided', () => {
    const description = 'Description';
    renderStudioCheckboxTableRow({ componentProps: { description } });

    const descriptionCell = screen.getByRole('cell', { name: description });
    expect(descriptionCell).toBeInTheDocument();
  });

  it('renders the description cell when description is an empty string', () => {
    const description = '';
    renderStudioCheckboxTableRow({ componentProps: { description } });

    const descriptionCell = screen.getByRole('cell', { name: '' });
    expect(descriptionCell).toBeInTheDocument();
  });
});

const defaultProps: StudioCheckboxTableRowProps = {
  label: option1,
  getCheckboxProps: { ...mockGetCheckboxProps, value: option1 },
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
