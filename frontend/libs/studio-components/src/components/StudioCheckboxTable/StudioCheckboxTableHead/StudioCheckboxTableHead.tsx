import React from 'react';
import type { ReactElement } from 'react';
import { StudioCheckbox } from '../../StudioCheckbox/StudioCheckbox';
import { StudioTable } from '../../StudioTable';
import { useCheckboxGroup } from '@digdir/designsystemet-react';

export type StudioCheckboxTableHeadProps = {
  title: string;
  // checked: boolean;
  allowIndeterminate?: boolean;
  initialValues: string[];
  disabled?: boolean;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
};

export function StudioCheckboxTableHead({
  title,
  // checked,
  allowIndeterminate,
  initialValues,
  disabled,
  onChange,
}: StudioCheckboxTableHeadProps): ReactElement {
  const { getCheckboxProps } = useCheckboxGroup({
    name: 'test',
    value: initialValues,
  });
  return (
    <StudioTable.Head>
      <StudioTable.Row>
        <StudioTable.HeaderCell /*Classname?? */>
          <StudioCheckbox
            aria-label={title}
            // checked={checked}
            onChange={onChange}
            disabled={disabled}
            value={'all'}
            {...getCheckboxProps({ allowIndeterminate, value: 'all' })}
          />
        </StudioTable.HeaderCell>
        <StudioTable.HeaderCell aria-hidden>{title}</StudioTable.HeaderCell>
      </StudioTable.Row>
    </StudioTable.Head>
  );
}
