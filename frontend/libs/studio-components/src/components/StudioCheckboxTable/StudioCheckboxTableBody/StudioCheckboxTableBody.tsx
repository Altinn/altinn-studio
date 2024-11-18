import React, { type ReactElement, type ReactNode } from 'react';
import { StudioTable } from '../../StudioTable';

export type StudioCheckboxTableBodyProps = {
  children: ReactNode;
};

export const StudioCheckboxTableBody = ({
  children,
}: StudioCheckboxTableBodyProps): ReactElement => {
  return <StudioTable.Body>{children}</StudioTable.Body>;
};
