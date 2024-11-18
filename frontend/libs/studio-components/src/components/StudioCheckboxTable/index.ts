import {
  StudioCheckboxTableBody,
  StudioCheckboxTableHeader,
  StudioCheckboxTable as StudioCheckboxTableParent,
  StudioCheckboxTableRow,
  type StudioCheckboxTableProps,
} from './StudioCheckboxTable';

type StudioCheckboxTableComponent = typeof StudioCheckboxTableParent & {
  Header: typeof StudioCheckboxTableHeader;
  Body: typeof StudioCheckboxTableBody;
  Row: typeof StudioCheckboxTableRow;
};

const StudioCheckboxTable = StudioCheckboxTableParent as StudioCheckboxTableComponent;

StudioCheckboxTable.Header = StudioCheckboxTableHeader;
StudioCheckboxTable.Body = StudioCheckboxTableBody;
StudioCheckboxTable.Row = StudioCheckboxTableRow;

export { StudioCheckboxTable, type StudioCheckboxTableProps };
