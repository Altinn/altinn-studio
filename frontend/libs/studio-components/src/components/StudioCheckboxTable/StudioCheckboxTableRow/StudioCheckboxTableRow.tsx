import React from 'react';
import type { ReactElement } from 'react';
import { StudioTable } from '../../StudioTable';
import { StudioCheckbox } from '../../StudioCheckbox';
import { type StudioCheckboxTableRowElement } from '../types/StudioCheckboxTableRowElement';
import type { StudioGetCheckboxProps } from '../types/StudioGetCheckboxProps';
import { CHECKBOX_TABLE_ERROR_ID } from '../constants';
import { useCheckboxTableContext } from '../StudioCheckboxTableContext';

export type StudioCheckboxTableRowProps = {
  rowElement: StudioCheckboxTableRowElement;
  getCheckboxProps: StudioGetCheckboxProps;
};

export function StudioCheckboxTableRow({
  rowElement,
  getCheckboxProps,
}: StudioCheckboxTableRowProps): ReactElement {
  const { label } = rowElement;
  const { hasError } = useCheckboxTableContext();

  return (
    <StudioTable.Row>
      <StudioTable.Cell /* classname?? */>
        <StudioCheckbox
          aria-label={rowElement.value}
          aria-describedby={CHECKBOX_TABLE_ERROR_ID}
          aria-invalid={hasError}
          {...getCheckboxProps}
        />
      </StudioTable.Cell>
      <StudioTable.Cell>{label}</StudioTable.Cell>
    </StudioTable.Row>
  );
}
