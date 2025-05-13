import React from 'react';
import type { ReactElement } from 'react';
import { StudioCheckbox } from '../../StudioCheckbox/StudioCheckbox';
import { StudioTable } from '../../StudioTable';
import type { GetCheckboxProps } from '@digdir/designsystemet-react/dist/types/utilities/hooks/useCheckboxGroup/useCheckboxGroup';
import { useCheckboxTableContext } from '../StudioCheckboxTableContext';

export type StudioCheckboxTableHeadProps = {
  title: string;
  getCheckboxProps: GetCheckboxProps;
};

export function StudioCheckboxTableHead({
  title,
  getCheckboxProps,
}: StudioCheckboxTableHeadProps): ReactElement {
  const { hasError } = useCheckboxTableContext();
  return (
    <StudioTable.Head>
      <StudioTable.Row>
        <StudioTable.HeaderCell /*Classname?? */>
          <StudioCheckbox
            aria-label={title}
            aria-invalid={hasError}
            value='all'
            {...getCheckboxProps}
          />
        </StudioTable.HeaderCell>
        <StudioTable.HeaderCell aria-hidden>{title}</StudioTable.HeaderCell>
      </StudioTable.Row>
    </StudioTable.Head>
  );
}
