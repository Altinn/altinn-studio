import { type FormItem } from '@altinn/ux-editor/types/FormItem';
import { type ComponentType } from 'app-shared/types/ComponentType';
import { type TableColumn } from '../types/TableColumn';
import { type IFormLayouts } from '@altinn/ux-editor/types/global';
import { type ITextResources } from 'app-shared/types/global';
import { getAllLayoutComponents } from '@altinn/ux-editor/utils/formLayoutUtils';
import { textResourceByLanguageAndIdSelector } from '@altinn/ux-editor/selectors/textResourceSelectors';
import { getRandNumber } from '@altinn/text-editor/utils';

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

export const getComponentsForSubformTable = (formLayouts: IFormLayouts): FormItem[] | undefined => {
  const components = formLayouts
    ? Object.values(formLayouts).flatMap((layout: any) => {
        return getAllLayoutComponents(layout);
      })
    : [];

  return componentsWithLabelAndDataModel(components);
};

const componentsWithLabelAndDataModel = (components: FormItem[]): FormItem[] | undefined => {
  return components.filter(
    (comp) => comp.textResourceBindings?.title && comp.dataModelBindings?.simpleBinding,
  );
};

export const getValueOfTitleId = (titleId: string, textResources: ITextResources): string => {
  return textResourceByLanguageAndIdSelector('nb', titleId)(textResources)?.value;
};

export const getTitleIdForColumn = (titleId: string): string => {
  const prefixTitleId = 'subform_table_column_title_';
  return titleId.startsWith(prefixTitleId) ? titleId : prefixTitleId + getRandNumber();
};
