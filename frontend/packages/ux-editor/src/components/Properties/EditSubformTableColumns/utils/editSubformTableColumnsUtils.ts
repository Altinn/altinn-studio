import { type FormItem } from '@altinn/ux-editor/types/FormItem';
import { type ComponentType } from 'app-shared/types/ComponentType';
import { type TableColumn } from '../types/TableColumn';

export const updateComponentWithSubform = (
  component: FormItem<ComponentType.SubForm>,
  tableColumnsToAdd: TableColumn[],
): FormItem<ComponentType.SubForm> => {
  return {
    ...component,
    tableColumns: [...(component?.tableColumns ?? []), ...tableColumnsToAdd],
  };
};

export const filterOutTableColumn = (
  tableColumns: TableColumn[],
  tableColumnToRemove: TableColumn,
): TableColumn[] => {
  return tableColumns.filter((tableColumn: TableColumn) => tableColumn !== tableColumnToRemove);
};
