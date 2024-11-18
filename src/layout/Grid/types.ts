import type { GridCellLabelFrom, GridCellText, GridComponentRef, GridRow } from 'src/layout/common.generated';

export interface GridCellNode extends Omit<GridComponentRef, 'component'> {
  nodeId: string;
}

export type GridCellInternal = GridCellNode | null | GridCellText | GridCellLabelFrom;

export interface GridRowInternal extends Omit<GridRow, 'cells'> {
  cells: GridCellInternal[];
}

export type GridRowsInternal = GridRowInternal[];
