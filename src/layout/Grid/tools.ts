import type { GridRowInternal, GridRowsInternal } from 'src/layout/common.generated';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export function nodesFromGrid(grid: LayoutNode<'Grid'>): LayoutNode[] {
  return nodesFromGridRows(grid.item.rows);
}

export function nodesFromGridRows(rows: GridRowsInternal): LayoutNode[] {
  const out: LayoutNode[] = [];
  for (const row of rows) {
    if (isGridRowHidden(row)) {
      continue;
    }

    out.push(...nodesFromGridRow(row));
  }

  return out;
}

export function nodesFromGridRow(row: GridRowInternal): LayoutNode[] {
  const out: LayoutNode[] = [];
  for (const cell of row.cells) {
    if (cell && ('text' in cell || 'labelFrom' in cell)) {
      continue;
    }
    const node = cell?.node;
    node && out.push(node);
  }

  return out;
}

export function isGridRowHidden(row: GridRowInternal) {
  let atLeastNoneNodeExists = false;
  const allCellsAreHidden = row.cells.every((cell) => {
    const node = cell && 'node' in cell && (cell?.node as LayoutNode);
    if (node && typeof node === 'object') {
      atLeastNoneNodeExists = true;
      return node.isHidden();
    }

    // Non-component cells always collapse and hide if components in other cells are hidden
    return true;
  });

  return atLeastNoneNodeExists && allCellsAreHidden;
}
