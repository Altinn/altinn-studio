import {
  StudioCheckboxTable as StudioCheckboxTableParent,
  type StudioCheckboxTableProps,
} from './StudioCheckboxTable';
import { StudioCheckboxTableBody } from './StudioCheckboxTableBody';
import { StudioCheckboxTableHeader } from './StudioCheckboxTableHeader';
import { StudioCheckboxTableRow } from './StudioCheckboxTableRow';
import { type StudioCheckboxTableRowElement } from './types/StudioCheckboxTableRowElement';

type StudioCheckboxTableComponent = typeof StudioCheckboxTableParent & {
  Header: typeof StudioCheckboxTableHeader;
  Body: typeof StudioCheckboxTableBody;
  Row: typeof StudioCheckboxTableRow;
};

/**
 * @deprecated Use `StudioCheckboxTable` from `@studio/components` instead.
 */
const StudioCheckboxTable = StudioCheckboxTableParent as StudioCheckboxTableComponent;

StudioCheckboxTable.Header = StudioCheckboxTableHeader;
StudioCheckboxTable.Body = StudioCheckboxTableBody;
StudioCheckboxTable.Row = StudioCheckboxTableRow;

export { StudioCheckboxTable, type StudioCheckboxTableProps, type StudioCheckboxTableRowElement };
