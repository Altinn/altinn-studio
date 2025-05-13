import React from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import { StudioTable } from '../../StudioTable';
import { StudioCheckbox } from '../../StudioCheckbox';
import { type StudioCheckboxTableRowElement } from '../types/StudioCheckboxTableRowElement';
import { useCheckboxGroup } from '@digdir/designsystemet-react';
import type { GetCheckboxProps } from '@digdir/designsystemet-react/dist/types/utilities/hooks/useCheckboxGroup/useCheckboxGroup';

export type StudioCheckboxTableRowProps = {
  rowElement: StudioCheckboxTableRowElement;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  // getCheckboxProps?: GetCheckboxProps;
};

export function StudioCheckboxTableRow({
  rowElement,
  onChange,
  // getCheckboxProps,
}: StudioCheckboxTableRowProps): ReactElement {
  const { value, label, checked, disabled, error } = rowElement;

  return (
    <StudioTable.Row>
      <StudioTable.Cell /* classname?? */>
        <StudioCheckbox
          aria-label={label}
          onChange={onChange}
          value={value}
          checked={checked}
          disabled={disabled}
          error={error}
          // {...getCheckboxProps}
        />
      </StudioTable.Cell>
      <StudioTable.Cell>{label}</StudioTable.Cell>
    </StudioTable.Row>
  );
}
