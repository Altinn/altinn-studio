import { StudioInputTable as StudioInputTableRoot } from './StudioInputTable';
import { StudioTable } from '../StudioTable';
import { StudioInputTableCell } from './Cell';
import { StudioInputTableHeaderCell } from './HeaderCell';
import { StudioInputTableRow } from './Row';

type StudioInputTableComponent = typeof StudioInputTableRoot & {
  Head: typeof StudioTable.Head;
  Body: typeof StudioTable.Body;
  Row: typeof StudioInputTableRow;
  Cell: typeof StudioInputTableCell;
  HeaderCell: typeof StudioInputTableHeaderCell;
};

export const StudioInputTable = StudioInputTableRoot as StudioInputTableComponent;

StudioInputTable.Head = StudioTable.Head;
StudioInputTable.Body = StudioTable.Body;
StudioInputTable.Row = StudioInputTableRow;
StudioInputTable.Cell = StudioInputTableCell;
StudioInputTable.HeaderCell = StudioInputTableHeaderCell;

StudioInputTable.displayName = 'StudioInputTable';
StudioInputTable.Head.displayName = 'StudioInputTable.Head';
StudioInputTable.Body.displayName = 'StudioInputTable.Body';
StudioInputTable.Row.displayName = 'StudioInputTable.Row';
