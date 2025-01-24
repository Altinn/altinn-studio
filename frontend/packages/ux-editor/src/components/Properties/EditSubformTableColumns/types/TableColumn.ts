type TableColumnCellContent = {
  query: string;
  default?: string;
};

export type TableColumn = {
  headerContent: string;
  cellContent: TableColumnCellContent;
  selectedBindingKey?: string;
  selectedBindingField?: string;
};
