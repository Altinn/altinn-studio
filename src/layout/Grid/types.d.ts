import type { ExprResolved } from 'src/features/expressions/types';
import type { ILayoutCompBase } from 'src/layout/layout';
import type { LayoutNode } from 'src/utils/layout/hierarchy';

export interface GridComponentRef {
  component: string;
}

export interface GridComponent {
  node: LayoutNode;
}

type GridComponentType = GridComponentRef | GridComponent;

export interface GridText {
  text: string;
  alignText?: 'left' | 'center' | 'right';
  textOverflow?: {
    lineWrap?: boolean;
    maxHeight?: number;
  };
}

export type GridCell<C extends GridComponentType = GridComponentRef> = C | GridText | null;

export interface GridRow<C extends GridComponentType = GridComponentRef> {
  header?: boolean;
  readOnly?: boolean;
  columnOptions?: ITableColumnProperties;
  cells: GridCell<C>[];
}

export interface ILayoutCompGrid<C extends GridComponentType = GridComponentRef> extends ILayoutCompBase<'Grid'> {
  rows: GridRow<C>[];
}

export type ILayoutGridHierarchy = ExprResolved<ILayoutCompGrid<GridComponent>>;
