export type GridRow = {
  header?: boolean;
  readonly?: boolean;
  columnOptions?: ColumnOptions;
  cells: GridCell[];
};

type ColumnOptions = {
  width?: string;
  alignText?: 'left' | 'center' | 'right';
  textOverflow?: {
    lineWrap?: boolean;
    maxHeight?: number;
  };
};

type GridCell = GridComponentRef | GridCellText | GridCellLabelFrom | null;

type GridComponentRef = {
  component?: string;
  columnOptions?: ColumnOptions;
};

type GridCellText = ColumnOptions & {
  text: string;
  help?: string;
  columnOptions?: ColumnOptions;
};

type GridCellLabelFrom = {
  labelFrom: string;
  columnOptions?: ColumnOptions;
};
