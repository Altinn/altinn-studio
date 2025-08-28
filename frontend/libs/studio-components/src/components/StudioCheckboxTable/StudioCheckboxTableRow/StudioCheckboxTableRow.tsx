import React from 'react';
import type { ReactElement } from 'react';
import { StudioTable } from '../../StudioTable';
import { StudioCheckbox } from '../../StudioCheckbox';
import type { StudioGetCheckboxProps } from '../types/StudioGetCheckboxProps';
import { CHECKBOX_TABLE_ERROR_ID } from '../constants';
import { useCheckboxTableContext } from '../StudioCheckboxTableContext';

export type StudioCheckboxTableRowProps = {
  label: string;
  description?: string;
  getCheckboxProps: StudioGetCheckboxProps;
};

export function StudioCheckboxTableRow({
  label,
  description,
  getCheckboxProps,
}: StudioCheckboxTableRowProps): ReactElement {
  const { hasError } = useCheckboxTableContext();

  const showDescriptionCell: boolean = description !== undefined || description === '';

  return (
    <StudioTable.Row>
      <StudioTable.Cell>
        <StudioCheckbox
          aria-label={label}
          aria-describedby={hasError ? CHECKBOX_TABLE_ERROR_ID : undefined}
          aria-invalid={hasError}
          {...getCheckboxProps}
        />
      </StudioTable.Cell>
      <StudioTable.Cell aria-hidden>{label}</StudioTable.Cell>
      {showDescriptionCell && <StudioTable.Cell>{description}</StudioTable.Cell>}
    </StudioTable.Row>
  );
}
