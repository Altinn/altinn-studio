import type { ComponentProps } from 'react';
import React, { forwardRef } from 'react';
import { Table } from '@digdir/designsystemet-react';

export type StudioTableProps = ComponentProps<typeof Table>;

export const StudioTable = forwardRef<HTMLTableElement, StudioTableProps>((props, ref) => (
  <Table size='sm' {...props} ref={ref} />
));

StudioTable.displayName = 'StudioTable';
