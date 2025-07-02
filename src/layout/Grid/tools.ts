import { useHasCapability } from 'src/utils/layout/canRenderIn';
import { useComponentIdMutator } from 'src/utils/layout/DataModelLocation';
import { useExternalItem } from 'src/utils/layout/hooks';
import { Hidden } from 'src/utils/layout/NodesContext';
import type {
  GridCell,
  GridCellLabelFrom,
  GridCellText,
  GridComponentRef,
  GridRow,
  GridRows,
} from 'src/layout/common.generated';
import type { IdMutator } from 'src/utils/layout/DataModelLocation';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';
import type { IsHiddenSelector } from 'src/utils/layout/NodesContext';

const emptyArray: never[] = [];

export function useNodeIdsFromGrid(grid: LayoutNode<'Grid'>, enabled = true) {
  const isHiddenSelector = Hidden.useIsHiddenSelector();
  const rows = useExternalItem(grid.baseId, 'Grid').rows;
  const idMutator = useComponentIdMutator();
  return enabled && grid && rows ? nodeIdsFromGridRows(rows, isHiddenSelector, idMutator) : emptyArray;
}

export function useNodeIdsFromGridRows(rows: GridRows | undefined, enabled = true) {
  const isHiddenSelector = Hidden.useIsHiddenSelector();
  const idMutator = useComponentIdMutator();
  const canRender = useHasCapability('renderInTable');
  return enabled && rows ? nodeIdsFromGridRows(rows, isHiddenSelector, idMutator).filter(canRender) : emptyArray;
}

function nodeIdsFromGridRows(
  rows: GridRows,
  isHiddenSelector: IsHiddenSelector,
  idMutator: IdMutator | undefined,
): string[] {
  const out: string[] = [];
  for (const row of rows) {
    if (isGridRowHidden(row, isHiddenSelector, idMutator)) {
      continue;
    }

    out.push(...nodeIdsFromGridRow(row, idMutator));
  }

  return out.length ? out : emptyArray;
}

export function nodeIdsFromGridRow(row: GridRow, idMutator: IdMutator | undefined): string[] {
  const out: string[] = [];
  for (const cell of row.cells) {
    if (isGridCellNode(cell)) {
      const baseId = cell.component ?? '';
      out.push(idMutator ? idMutator(baseId) : baseId);
    }
  }

  return out.length ? out : emptyArray;
}

export function isGridRowHidden(row: GridRow, isHiddenSelector: IsHiddenSelector, idMutator: IdMutator | undefined) {
  let atLeastNoneNodeExists = false;
  const allCellsAreHidden = row.cells.every((cell) => {
    if (isGridCellNode(cell)) {
      atLeastNoneNodeExists = true;
      const baseId = cell.component ?? '';
      return isHiddenSelector(idMutator ? idMutator(baseId) : baseId);
    }

    // Non-component cells always collapse and hide if components in other cells are hidden
    return true;
  });

  return atLeastNoneNodeExists && allCellsAreHidden;
}

export function isGridCellText(cell: GridCell): cell is GridCellText {
  return !!(cell && 'text' in cell && cell.text !== undefined);
}

export function isGridCellLabelFrom(cell: GridCell): cell is GridCellLabelFrom {
  return !!(cell && 'labelFrom' in cell && cell.labelFrom !== undefined);
}

export function isGridCellEmpty(cell: GridCell): boolean {
  return cell === null || (isGridCellText(cell) && cell.text === '');
}

export function isGridCellNode(cell: GridCell): cell is GridComponentRef {
  return !!(cell && 'component' in cell && cell.component);
}
