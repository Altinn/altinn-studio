type TableColumnCellContent = {
  query: string;
  default?: string;
};

export type TableColumn = {
  headerContent: string;
  cellContent: TableColumnCellContent;
};
