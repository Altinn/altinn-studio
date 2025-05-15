import { StudioCheckboxTable as StudioCheckboxTableParent } from './StudioCheckboxTable';
import type { StudioCheckboxTableProps } from './StudioCheckboxTable';
import { StudioCheckboxTableBody } from './StudioCheckboxTableBody';
import { StudioCheckboxTableHead } from './StudioCheckboxTableHead';
import { StudioCheckboxTableRow } from './StudioCheckboxTableRow';
import { useStudioCheckboxTableLogic } from './hook/useStudioCheckboxTableLogic';
import type { StudioGetCheckboxProps } from './types/StudioGetCheckboxProps';

type StudioCheckboxTableComponent = typeof StudioCheckboxTableParent & {
  Head: typeof StudioCheckboxTableHead;
  Body: typeof StudioCheckboxTableBody;
  Row: typeof StudioCheckboxTableRow;
};

/**
 * If you want to use the error logic, import and use the `useStudioCheckboxTableLogic` hook.
 */
const StudioCheckboxTable = StudioCheckboxTableParent as StudioCheckboxTableComponent;

StudioCheckboxTable.Head = StudioCheckboxTableHead;
StudioCheckboxTable.Body = StudioCheckboxTableBody;
StudioCheckboxTable.Row = StudioCheckboxTableRow;

export { StudioCheckboxTable };
export type { StudioCheckboxTableProps };
export { useStudioCheckboxTableLogic };
export type { StudioGetCheckboxProps };
