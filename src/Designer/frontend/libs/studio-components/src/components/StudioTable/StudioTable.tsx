import type { ComponentProps } from 'react';
import React, { forwardRef } from 'react';
import { Table } from '@digdir/designsystemet-react';
import type { WithoutAsChild } from '../../types/WithoutAsChild';

export type StudioTableProps = WithoutAsChild<ComponentProps<typeof Table>>;

export const StudioTable = forwardRef<HTMLTableElement, StudioTableProps>((props, ref) => (
  <Table {...props} ref={ref} />
));

StudioTable.displayName = 'StudioTable';
