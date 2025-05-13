import React from 'react';
import type { ReactElement } from 'react';
import { StudioTable } from '../StudioTable';
import type { StudioTableProps } from '../StudioTable/StudioTable';

export type StudioCheckboxTableProps = StudioTableProps;

export function StudioCheckboxTable({
  className,
  children,
}: StudioCheckboxTableProps): ReactElement {
  return <StudioTable className={className}>{children}</StudioTable>;
}
