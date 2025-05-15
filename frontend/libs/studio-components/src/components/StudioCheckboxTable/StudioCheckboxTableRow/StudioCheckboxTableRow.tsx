import React from 'react';
import type { ReactElement } from 'react';
import { StudioTable } from '../../StudioTable';
import { StudioCheckbox } from '../../StudioCheckbox';
import type { StudioGetCheckboxProps } from '../types/StudioGetCheckboxProps';
import { CHECKBOX_TABLE_ERROR_ID } from '../constants';
import { useCheckboxTableContext } from '../StudioCheckboxTableContext';

export type StudioCheckboxTableRowProps = {
  label: string;
  getCheckboxProps: StudioGetCheckboxProps;
};

export function StudioCheckboxTableRow({
  label,
  getCheckboxProps,
}: StudioCheckboxTableRowProps): ReactElement {
  const { hasError } = useCheckboxTableContext();

  return (
    <StudioTable.Row>
      <StudioTable.Cell>
        <StudioCheckbox
          aria-label={label}
          aria-describedby={CHECKBOX_TABLE_ERROR_ID}
          aria-invalid={hasError}
          {...getCheckboxProps}
        />
      </StudioTable.Cell>
      <StudioTable.Cell>{label}</StudioTable.Cell>
    </StudioTable.Row>
  );
}
