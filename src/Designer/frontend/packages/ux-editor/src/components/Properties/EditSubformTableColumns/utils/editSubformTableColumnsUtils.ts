import { type FormItem } from '@altinn/ux-editor/types/FormItem';
import { type ComponentType } from 'app-shared/types/ComponentType';
import { type TableColumn } from '../types/TableColumn';
import type { IInternalLayout, IFormLayouts } from '@altinn/ux-editor/types/global';
import { getAllLayoutComponents } from '@altinn/ux-editor/utils/formLayoutUtils';
import { type LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';

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

export const getComponentsForSubformTable = (
  formLayouts: IFormLayouts,
  defaultDataModel: string,
): FormItem[] => {
  const components = Object.values(formLayouts ?? {}).flatMap((layout: IInternalLayout) =>
    getAllLayoutComponents(layout),
  );

  return componentsWithTitleAndDefaultDataModel(components, defaultDataModel);
};

const componentsWithTitleAndDefaultDataModel = (
  components: FormItem[],
  defaultDataModel: string,
): FormItem[] => {
  const hasValidDataBinding = (comp: FormItem) =>
    Object.keys(comp.dataModelBindings ?? {}).some((binding) => {
      const { dataType, field } = comp?.dataModelBindings?.[binding];
      return dataType === defaultDataModel || (dataType === '' && field !== '');
    });

  return components.filter((comp) => comp.textResourceBindings?.title && hasValidDataBinding(comp));
};

export const getDefaultDataModel = (layoutSets: LayoutSets, subformLayout: string): string => {
  const layoutSet = layoutSets?.sets.find((layoutSet) => layoutSet.id === subformLayout);

  return layoutSet?.dataType ?? '';
};
