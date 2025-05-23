import React from 'react';
import type { ReactElement } from 'react';
import { StudioCheckbox } from '../../StudioCheckbox/StudioCheckbox';
import { StudioTable } from '../../StudioTable';
import type { StudioGetCheckboxProps } from '../types/StudioGetCheckboxProps';
import { useCheckboxTableContext } from '../StudioCheckboxTableContext';

export type StudioCheckboxTableHeadProps = {
  title: string;
  getCheckboxProps: StudioGetCheckboxProps;
  descriptionCellTitle?: string;
};

export function StudioCheckboxTableHead({
  title,
  getCheckboxProps,
  descriptionCellTitle,
}: StudioCheckboxTableHeadProps): ReactElement {
  const { hasError } = useCheckboxTableContext();
  return (
    <StudioTable.Head>
      <StudioTable.Row>
        <StudioTable.HeaderCell>
          <StudioCheckbox
            aria-label={title}
            aria-invalid={hasError}
            value='all'
            {...getCheckboxProps}
          />
        </StudioTable.HeaderCell>
        <StudioTable.HeaderCell aria-hidden>{title}</StudioTable.HeaderCell>
        {descriptionCellTitle && (
          <StudioTable.HeaderCell>{descriptionCellTitle}</StudioTable.HeaderCell>
        )}
      </StudioTable.Row>
    </StudioTable.Head>
  );
}
