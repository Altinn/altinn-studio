import React from 'react';
import type { ReactElement } from 'react';
import { StudioTable } from '../../StudioTable';
import type { StudioCheckboxTableRowProps } from '../StudioCheckboxTableRow';

export type StudioCheckboxTableBodyProps = {
  children: ReactElement<StudioCheckboxTableRowProps>[];
};

export function StudioCheckboxTableBody({ children }: StudioCheckboxTableBodyProps): ReactElement {
  return <StudioTable.Body>{children}</StudioTable.Body>;
}
