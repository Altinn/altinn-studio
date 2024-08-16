import { StudioInputTable as StudioInputTableRoot } from './StudioInputTable';
import { StudioTable } from '../StudioTable';

type StudioInputTableComponent = typeof StudioInputTableRoot & {
  Head: typeof StudioTable.Head;
  Body: typeof StudioTable.Body;
  Row: typeof StudioTable.Row;
  Cell: typeof StudioTable.Cell;
  HeaderCell: typeof StudioTable.HeaderCell;
};

const StudioInputTable = StudioInputTableRoot as StudioInputTableComponent;

StudioInputTable.Head = StudioTable.Head;
StudioInputTable.Body = StudioTable.Body;
StudioInputTable.Row = StudioTable.Row;
StudioInputTable.Cell = StudioTable.Cell;
StudioInputTable.HeaderCell = StudioTable.HeaderCell;

StudioInputTable.displayName = 'StudioInputTable';
StudioInputTable.Head.displayName = 'StudioInputTable.Head';
StudioInputTable.Body.displayName = 'StudioInputTable.Body';
StudioInputTable.Row.displayName = 'StudioInputTable.Row';
StudioInputTable.Cell.displayName = 'StudioInputTable.Cell';
StudioInputTable.HeaderCell.displayName = 'StudioInputTable.HeaderCell';
