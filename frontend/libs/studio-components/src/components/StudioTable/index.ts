import { Table } from '@digdir/designsystemet-react';
import type { ComponentProps } from 'react';

type StudioTableComponent = typeof Table;

export const StudioTable: StudioTableComponent = Table;

StudioTable.displayName = 'StudioTable';
StudioTable.Head.displayName = 'StudioTable.Head';
StudioTable.Body.displayName = 'StudioTable.Body';
StudioTable.Row.displayName = 'StudioTable.Row';
StudioTable.Cell.displayName = 'StudioTable.Cell';
StudioTable.HeaderCell.displayName = 'StudioTable.HeaderCell';

export type StudioTableProps = ComponentProps<typeof Table>;
