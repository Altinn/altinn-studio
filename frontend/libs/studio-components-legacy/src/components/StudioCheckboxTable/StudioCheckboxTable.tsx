import React, { type ReactElement } from 'react';
import { StudioTable, type StudioTableProps } from '../StudioTable';

export type StudioCheckboxTableProps = StudioTableProps;

export const StudioCheckboxTable = ({
  className,
  children,
}: StudioCheckboxTableProps): ReactElement => {
  return <StudioTable className={className}>{children}</StudioTable>;
};
