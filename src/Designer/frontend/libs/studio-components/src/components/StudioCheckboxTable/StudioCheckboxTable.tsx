import React from 'react';
import type { ReactElement } from 'react';
import classes from './StudioCheckboxTable.module.css';
import { StudioTable } from '../StudioTable';
import type { StudioTableProps } from '../StudioTable/StudioTable';
import { StudioCheckboxTableContextProvider } from './StudioCheckboxTableContext';
import { StudioValidationMessage } from '../StudioValidationMessage';
import { CHECKBOX_TABLE_ERROR_ID } from './constants';

export type StudioCheckboxTableProps = StudioTableProps & {
  hasError?: boolean;
  errorMessage?: string;
};

export function StudioCheckboxTable({
  className,
  children,
  hasError,
  errorMessage,
}: StudioCheckboxTableProps): ReactElement {
  return (
    <StudioCheckboxTableContextProvider hasError={hasError}>
      <StudioTable className={className}>{children}</StudioTable>
      {hasError && errorMessage && (
        <StudioValidationMessage id={CHECKBOX_TABLE_ERROR_ID} className={classes.errorMessage}>
          {errorMessage}
        </StudioValidationMessage>
      )}
    </StudioCheckboxTableContextProvider>
  );
}
