import { StudioCheckboxTable as StudioCheckboxTableParent } from './StudioCheckboxTable';
import type { StudioCheckboxTableProps } from './StudioCheckboxTable';
import { StudioCheckboxTableBody } from './StudioCheckboxTableBody';
import { StudioCheckboxTableHead } from './StudioCheckboxTableHead';
import { StudioCheckboxTableRow } from './StudioCheckboxTableRow';
import type { StudioCheckboxTableRowElement } from './types/StudioCheckboxTableRowElement';

type StudioCheckboxTableComponent = typeof StudioCheckboxTableParent & {
  Head: typeof StudioCheckboxTableHead;
  Body: typeof StudioCheckboxTableBody;
  Row: typeof StudioCheckboxTableRow;
};

const StudioCheckboxTable = StudioCheckboxTableParent as StudioCheckboxTableComponent;

StudioCheckboxTable.Head = StudioCheckboxTableHead;
StudioCheckboxTable.Body = StudioCheckboxTableBody;
StudioCheckboxTable.Row = StudioCheckboxTableRow;

export { StudioCheckboxTable };
export type { StudioCheckboxTableProps, StudioCheckboxTableRowElement };
