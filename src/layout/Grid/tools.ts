import { Hidden } from 'src/utils/layout/NodesContext';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import type { GridCell, GridCellLabelFrom, GridCellText } from 'src/layout/common.generated';
import type { GridCellInternal, GridCellNode, GridRowInternal, GridRowsInternal } from 'src/layout/Grid/types';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';
import type { IsHiddenSelector } from 'src/utils/layout/NodesContext';

const emptyArray: never[] = [];

export function useNodeIdsFromGrid(grid: LayoutNode<'Grid'>, enabled = true) {
  const isHiddenSelector = Hidden.useIsHiddenSelector();
  const rows = useNodeItem(grid, (item) => item.rowsInternal);
  return enabled && grid && rows ? nodeIdsFromGridRows(rows, isHiddenSelector) : emptyArray;
}

export function useNodeIdsFromGridRows(rows: GridRowsInternal | undefined, enabled = true) {
  const isHiddenSelector = Hidden.useIsHiddenSelector();
  return enabled && rows ? nodeIdsFromGridRows(rows, isHiddenSelector) : emptyArray;
}

function nodeIdsFromGridRows(rows: GridRowsInternal, isHiddenSelector: IsHiddenSelector): string[] {
  const out: string[] = [];
  for (const row of rows) {
    if (isGridRowHidden(row, isHiddenSelector)) {
      continue;
    }

    out.push(...nodeIdsFromGridRow(row));
  }

  return out.length ? out : emptyArray;
}

export function nodeIdsFromGridRow(row: GridRowInternal): string[] {
  const out: string[] = [];
  for (const cell of row.cells) {
    if (isGridCellNode(cell)) {
      out.push(cell.nodeId);
    }
  }

  return out.length ? out : emptyArray;
}

export function isGridRowHidden(row: GridRowInternal, isHiddenSelector: IsHiddenSelector) {
  let atLeastNoneNodeExists = false;
  const allCellsAreHidden = row.cells.every((cell) => {
    if (isGridCellNode(cell)) {
      atLeastNoneNodeExists = true;
      return isHiddenSelector(cell.nodeId);
    }

    // Non-component cells always collapse and hide if components in other cells are hidden
    return true;
  });

  return atLeastNoneNodeExists && allCellsAreHidden;
}

export function isGridCellText(cell: GridCellInternal | GridCell): cell is GridCellText {
  return !!(cell && 'text' in cell && cell.text !== undefined);
}

export function isGridCellLabelFrom(cell: GridCellInternal | GridCell): cell is GridCellLabelFrom {
  return !!(cell && 'labelFrom' in cell && cell.labelFrom !== undefined);
}

export function isGridCellEmpty(cell: GridCellInternal | GridCell): boolean {
  return cell === null || (isGridCellText(cell) && cell.text === '');
}

export function isGridCellNode(cell: GridCellInternal): cell is GridCellNode {
  return !!(cell && 'nodeId' in cell && cell.nodeId);
}
