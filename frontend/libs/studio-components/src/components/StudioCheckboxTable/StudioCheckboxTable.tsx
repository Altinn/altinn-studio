import React from 'react';
import type { ReactElement } from 'react';
import { StudioTable } from '../StudioTable';
import type { StudioTableProps } from '../StudioTable/StudioTable';
import { StudioCheckboxTableContextProvider } from './StudioCheckboxTableContext';

export type StudioCheckboxTableProps = StudioTableProps & {
  hasError?: boolean;
};

export function StudioCheckboxTable({
  className,
  children,
  hasError,
}: StudioCheckboxTableProps): ReactElement {
  return (
    <StudioTable className={className}>
      <StudioCheckboxTableContextProvider hasError={hasError}>
        {children}
      </StudioCheckboxTableContextProvider>
    </StudioTable>
  );
}
