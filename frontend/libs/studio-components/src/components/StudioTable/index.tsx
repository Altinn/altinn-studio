import { Table } from '@digdir/designsystemet-react';
import { StudioTable as StudioTableRoot } from './StudioTable';
import type { ComponentProps } from 'react';

type StudioTableComponent = typeof Table;

export const StudioTable: StudioTableComponent = StudioTableRoot as StudioTableComponent;

StudioTable.Head = Table.Head;
StudioTable.Body = Table.Body;
StudioTable.Row = Table.Row;
StudioTable.Cell = Table.Cell;
StudioTable.HeaderCell = Table.HeaderCell;
StudioTable.Foot = Table.Foot;

StudioTable.Head.displayName = 'StudioTable.Head';
StudioTable.Body.displayName = 'StudioTable.Body';
StudioTable.Row.displayName = 'StudioTable.Row';
StudioTable.Cell.displayName = 'StudioTable.Cell';
StudioTable.HeaderCell.displayName = 'StudioTable.HeaderCell';
StudioTable.Foot.displayName = 'StudioTable.Foot';

export type StudioTableProps = ComponentProps<typeof Table>;
