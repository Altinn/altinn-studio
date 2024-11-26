import type { InternalBindingFormat } from '@altinn/ux-editor/utils/dataModelUtils';

type TableColumnCellContent = {
  query: string | InternalBindingFormat;
  default?: string;
};

export type TableColumn = {
  headerContent: string;
  cellContent: TableColumnCellContent;
};
