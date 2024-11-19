import React, { type ReactElement } from 'react';
import { StudioTable } from '../../StudioTable';
import { type StudioCheckboxTableRowProps } from '../StudioCheckboxTableRow/StudioCheckboxTableRow';

export type StudioCheckboxTableBodyProps = {
  children: ReactElement<StudioCheckboxTableRowProps>[];
};

export const StudioCheckboxTableBody = ({
  children,
}: StudioCheckboxTableBodyProps): ReactElement => {
  return <StudioTable.Body>{children}</StudioTable.Body>;
};
