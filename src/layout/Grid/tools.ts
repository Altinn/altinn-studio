import type { GridComponent, GridRow } from 'src/layout/Grid/types';
import type { LayoutNodeFromType } from 'src/utils/layout/hierarchy.types';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export function nodesFromGrid(grid: LayoutNodeFromType<'Grid'>): LayoutNode[] {
  const out: LayoutNode[] = [];
  for (const row of grid.item.rows) {
    if (isGridRowHidden(row)) {
      continue;
    }

    for (const cell of row.cells) {
      if (cell && 'text' in cell) {
        continue;
      }
      const node = cell?.node as LayoutNode;
      node && out.push(node);
    }
  }

  return out;
}

export function isGridRowHidden(row: GridRow<GridComponent>) {
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
