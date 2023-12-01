import { UseText } from '../hooks';
import { LayoutItemType } from './global';

export interface Expression {
  operator?: Operator;
  property: ExpressionProperty;
  subExpressions?: SubExpression[];
  complexExpression?: any;
}

export interface SubExpression {
  function?: ExpressionFunction;
  dataSource?: string;
  value?: string | number | boolean;
  comparableDataSource?: string;
  comparableValue?: string | number | boolean;
}

export enum Operator {
  And = 'and',
  Or = 'or',
}

export type ExpressionProperty = ExpressionPropertyBase | ExpressionPropertyForGroup;

// Could we instead collect all properties from the specific component that has the type boolean?
// What about strings that can be set with e.g. if/else and concat
export enum ExpressionPropertyBase {
  Hidden = 'hidden',
  ReadOnly = 'readOnly',
  Required = 'required',
}

export enum ExpressionPropertyForGroup {
  EditAddButton = 'edit.addButton',
  EditDeleteButton = 'edit.deleteButton',
  EditSaveButton = 'edit.saveButton',
  EditSaveAndNextButton = 'edit.saveAndNextButton',
} // TODO: Remove prefix and sync with FormContainer type. https://github.com/Altinn/altinn-studio/issues/11524

export enum ExpressionFunction {
  Equals = 'equals',
  NotEquals = 'notEquals',
  Not = 'not',
  GreaterThan = 'greaterThan',
  GreaterThanEq = 'greaterThanEq',
  LessThan = 'lessThan',
  LessThanEq = 'lessThanEq',
}

export enum DataSource {
  Component = 'component',
  DataModel = 'dataModel',
  InstanceContext = 'instanceContext',
  ApplicationSettings = 'applicationSettings', // get all fields from section "FrontEndSettings" in applicationSettings
  String = 'string',
  Number = 'number',
  Boolean = 'boolean',
  Null = 'null',
}

export const getExpressionPropertiesBasedOnComponentType = (
  componentType: LayoutItemType.Component | LayoutItemType.Container,
): ExpressionProperty[] => {
  const expressionProperties = Object.values(ExpressionPropertyBase) as string[];
  if (componentType === LayoutItemType.Container) {
    return expressionProperties.concat(
      Object.values(ExpressionPropertyForGroup) as string[],
    ) as ExpressionProperty[];
  }
  return expressionProperties as ExpressionProperty[];
};

export const expressionFunctionTexts = (t: UseText) => ({
  [ExpressionFunction.Equals]: t('right_menu.expressions_function_equals'),
  [ExpressionFunction.NotEquals]: t('right_menu.expressions_function_not_equals'),
  [ExpressionFunction.Not]: t('right_menu.expressions_function_not'),
  [ExpressionFunction.GreaterThan]: t('right_menu.expressions_function_greater_than'),
  [ExpressionFunction.GreaterThanEq]: t('right_menu.expressions_function_greater_than_eq'),
  [ExpressionFunction.LessThan]: t('right_menu.expressions_function_less_than'),
  [ExpressionFunction.LessThanEq]: t('right_menu.expressions_function_less_than_eq'),
});

export const expressionPropertyTexts = (t: UseText) => ({
  [ExpressionPropertyBase.Hidden]: t('right_menu.expressions_property_hidden'),
  [ExpressionPropertyBase.ReadOnly]: t('right_menu.expressions_property_read_only'),
  [ExpressionPropertyBase.Required]: t('right_menu.expressions_property_required'),
  [ExpressionPropertyForGroup.EditAddButton]: t(
    'right_menu.expressions_group_property_show_add_button',
  ),
  [ExpressionPropertyForGroup.EditSaveAndNextButton]: t(
    'right_menu.expressions_group_property_show_edit_button',
  ),
  [ExpressionPropertyForGroup.EditDeleteButton]: t(
    'right_menu.expressions_group_property_show_delete_button',
  ),
  [ExpressionPropertyForGroup.EditSaveButton]: t(
    'right_menu.expressions_group_property_show_save_button',
  ),
});

export const expressionInPreviewPropertyTextKeys = {
  [ExpressionPropertyBase.Hidden]: 'right_menu.expressions_property_preview_hidden',
  [ExpressionPropertyBase.ReadOnly]: 'right_menu.expressions_property_preview_read_only',
  [ExpressionPropertyBase.Required]: 'right_menu.expressions_property_preview_required',
  [ExpressionPropertyForGroup.EditAddButton]:
    'right_menu.expressions_group_property_preview_show_add_button',
  [ExpressionPropertyForGroup.EditSaveAndNextButton]:
    'right_menu.expressions_group_property_preview_show_edit_button',
  [ExpressionPropertyForGroup.EditDeleteButton]:
    'right_menu.expressions_group_property_preview_show_delete_button',
  [ExpressionPropertyForGroup.EditSaveButton]:
    'right_menu.expressions_group_property_preview_show_save_button',
};

export const expressionDataSourceTexts = (t: UseText) => ({
  [DataSource.Component]: t('right_menu.expressions_data_source_component'),
  [DataSource.DataModel]: t('right_menu.expressions_data_source_data_model'),
  [DataSource.InstanceContext]: t('right_menu.expressions_data_source_instance_context'),
  [DataSource.ApplicationSettings]: t('right_menu.expressions_data_source_application_settings'),
  [DataSource.String]: t('right_menu.expressions_data_source_string'),
  [DataSource.Number]: t('right_menu.expressions_data_source_number'),
  [DataSource.Boolean]: t('right_menu.expressions_data_source_boolean'),
  [DataSource.Null]: t('right_menu.expressions_data_source_null'),
});
