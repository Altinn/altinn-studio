import { Hidden } from 'src/utils/layout/NodesContext';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import type { GridCell, GridCellLabelFrom, GridCellText } from 'src/layout/common.generated';
import type { GridCellInternal, GridCellNode, GridRowInternal, GridRowsInternal } from 'src/layout/Grid/types';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';
import type { IsHiddenSelector } from 'src/utils/layout/NodesContext';

const emptyArray: never[] = [];

export function useNodesFromGrid(grid: LayoutNode<'Grid'> | undefined, enabled = true) {
  const isHiddenSelector = Hidden.useIsHiddenSelector();
  const rows = useNodeItem(grid, (item) => item.rowsInternal);
  return enabled && grid && rows ? nodesFromGridRows(rows, isHiddenSelector) : emptyArray;
}

export function useNodesFromGridRows(rows: GridRowsInternal | undefined, enabled = true) {
  const isHiddenSelector = Hidden.useIsHiddenSelector();
  return enabled && rows ? nodesFromGridRows(rows, isHiddenSelector) : emptyArray;
}

function nodesFromGridRows(rows: GridRowsInternal, isHiddenSelector: IsHiddenSelector): LayoutNode[] {
  const out: LayoutNode[] = [];
  for (const row of rows) {
    if (isGridRowHidden(row, isHiddenSelector)) {
      continue;
    }

    out.push(...nodesFromGridRow(row));
  }

  return out.length ? out : emptyArray;
}

export function nodesFromGridRow(row: GridRowInternal): LayoutNode[] {
  const out: LayoutNode[] = [];
  for (const cell of row.cells) {
    if (isGridCellNode(cell)) {
      out.push(cell.node);
    }
  }

  return out.length ? out : emptyArray;
}

export function isGridRowHidden(row: GridRowInternal, isHiddenSelector: IsHiddenSelector) {
  let atLeastNoneNodeExists = false;
  const allCellsAreHidden = row.cells.every((cell) => {
    if (isGridCellNode(cell)) {
      atLeastNoneNodeExists = true;
      return isHiddenSelector(cell.node);
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
  return !!(cell && 'node' in cell && cell.node);
}
