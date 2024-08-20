import type { GridCellLabelFrom, GridCellText, GridComponentRef, GridRow } from 'src/layout/common.generated';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export interface GridCellNode extends Omit<GridComponentRef, 'component'> {
  node: LayoutNode;
}

export type GridCellInternal = GridCellNode | null | GridCellText | GridCellLabelFrom;

export interface GridRowInternal extends Omit<GridRow, 'cells'> {
  cells: GridCellInternal[];
}

export type GridRowsInternal = GridRowInternal[];
