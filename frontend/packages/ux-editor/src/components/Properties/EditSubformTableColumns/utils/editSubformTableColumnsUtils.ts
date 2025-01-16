import { type FormItem } from '@altinn/ux-editor/types/FormItem';
import { type ComponentType } from 'app-shared/types/ComponentType';
import { type TableColumn } from '../types/TableColumn';
import type { IInternalLayout, IFormLayouts } from '@altinn/ux-editor/types/global';
import { type ITextResources } from 'app-shared/types/global';
import { getAllLayoutComponents } from '@altinn/ux-editor/utils/formLayoutUtils';
import { textResourceByLanguageAndIdSelector } from '@altinn/ux-editor/selectors/textResourceSelectors';
import { getRandNumber } from '@altinn/text-editor/utils';
import { type LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';
import { convertDataBindingToInternalFormat } from '@altinn/ux-editor/utils/dataModelUtils';

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
      const { dataType, field } = convertDataBindingToInternalFormat(comp, binding);
      return dataType === defaultDataModel || (dataType === '' && field !== '');
    });

  return components.filter((comp) => comp.textResourceBindings?.title && hasValidDataBinding(comp));
};

export const getDefaultDataModel = (layoutSets: LayoutSets, subformLayout: string): string => {
  const layoutSet = layoutSets.sets.find((layoutSet) => layoutSet.id === subformLayout);

  return layoutSet?.dataType ?? '';
};

export const getValueOfTitleId = (titleId: string, textResources: ITextResources): string => {
  return textResourceByLanguageAndIdSelector('nb', titleId)(textResources)?.value;
};

type TitleIdForColumn = {
  titleId: string;
  subformId: string;
  textResources: ITextResources;
};

export const getTitleIdForColumn = ({
  titleId,
  subformId,
  textResources,
}: TitleIdForColumn): string => {
  const prefixTitleId = 'subform_table_column_title_';

  if (titleId.startsWith(prefixTitleId)) {
    return titleId;
  }

  const resourcesArray = Object.values(textResources).flat();
  const isUnique = (id: string): boolean => !resourcesArray.some((resource) => resource.id === id);

  let uniqueTitleId = prefixTitleId + subformId;
  while (!isUnique(uniqueTitleId)) {
    uniqueTitleId = prefixTitleId + subformId + getRandNumber();
  }

  return uniqueTitleId;
};
