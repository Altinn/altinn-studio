import React from 'react';
import { render, screen } from '@testing-library/react';
import { type RenderResult } from '@testing-library/react';
import { StudioCheckboxTableHead } from './StudioCheckboxTableHead';
import type { StudioCheckboxTableHeadProps } from './StudioCheckboxTableHead';
import { StudioCheckboxTableContextProvider } from '../StudioCheckboxTableContext';
import type { StudioCheckboxTableContextProps } from '../StudioCheckboxTableContext';
import type { StudioGetCheckboxProps } from '../types/StudioGetCheckboxProps';

const mockCheckboxTitle: string = 'Select all';
const mockGetCheckboxProps: StudioGetCheckboxProps = {
  value: 'all',
};
const defaultStudioCheckboxContextProps: StudioCheckboxTableContextProps = {
  hasError: false,
};

describe('StudioCheckboxTableHead', () => {
  it('renders a checkbox with the correct aria-label and value', () => {
    renderStudioCheckboxTableHead();
    const checkbox = screen.getByRole('checkbox', { name: mockCheckboxTitle });
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).toHaveAttribute('value', 'all');
    expect(checkbox).toHaveAttribute('aria-invalid', 'false');
    expect(checkbox).toHaveAttribute('aria-label', mockCheckboxTitle);
  });

  it('sets aria-invalid to true when context hasError is true', () => {
    renderStudioCheckboxTableHead({ providerProps: { hasError: true } });

    const checkbox = screen.getByRole('checkbox', { name: mockCheckboxTitle });
    expect(checkbox).toHaveAttribute('aria-invalid', 'true');
  });

  it('renders the title in the header cell', () => {
    renderStudioCheckboxTableHead();
    const headerCell = screen.getByRole('columnheader', { name: mockCheckboxTitle });
    expect(headerCell).toBeInTheDocument();
  });

  it('renders the description cell title when provided', () => {
    const descriptionCellTitle = 'Description';
    renderStudioCheckboxTableHead({ componentProps: { descriptionCellTitle } });

    const descriptionHeaderCell = screen.getByRole('columnheader', { name: descriptionCellTitle });
    expect(descriptionHeaderCell).toBeInTheDocument();
  });
});

const defaultProps: StudioCheckboxTableHeadProps = {
  title: mockCheckboxTitle,
  getCheckboxProps: mockGetCheckboxProps,
};

type Props = {
  componentProps?: Partial<StudioCheckboxTableHeadProps>;
  providerProps?: Partial<StudioCheckboxTableContextProps>;
};

function renderStudioCheckboxTableHead(props: Partial<Props> = {}): RenderResult {
  const { componentProps, providerProps } = props;
  return render(
    <StudioCheckboxTableContextProvider {...defaultStudioCheckboxContextProps} {...providerProps}>
      <table>
        <StudioCheckboxTableHead {...defaultProps} {...componentProps} />
      </table>
    </StudioCheckboxTableContextProvider>,
  );
}
