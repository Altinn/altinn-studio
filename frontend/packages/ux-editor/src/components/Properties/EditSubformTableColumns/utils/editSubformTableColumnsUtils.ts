import { type FormItem } from '@altinn/ux-editor/types/FormItem';
import { type ComponentType } from 'app-shared/types/ComponentType';
import { type TableColumn } from '../types/TableColumn';

export const updateComponentWithSubform = (
  component: FormItem<ComponentType.Subform>,
  tableColumnsToAdd: TableColumn[],
): FormItem<ComponentType.Subform> => {
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
