import i18next from 'i18next';

// Could we instead collect all properties from the specific component that has the type boolean?
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
}

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
  ApplicationSettings = 'applicationSettings',
  String = 'string',
  Number = 'number',
  Boolean = 'boolean',
  Null  = 'null',
}

export const expressionFunctionTexts = (t: typeof i18next.t) => ({
  [ExpressionFunction.Equals]: t('right_menu.dynamics_function_equals'),
  [ExpressionFunction.NotEquals]: t('right_menu.dynamics_function_not_equals'),
  [ExpressionFunction.Not]: t('right_menu.dynamics_function_not'),
  [ExpressionFunction.GreaterThan]: t('right_menu.dynamics_function_greater_than'),
  [ExpressionFunction.GreaterThanEq]: t('right_menu.dynamics_function_greater_than_eq'),
  [ExpressionFunction.LessThan]: t('right_menu.dynamics_function_less_than'),
  [ExpressionFunction.LessThanEq]: t('right_menu.dynamics_function_less_than_eq'),
});

export const expressionPropertyTexts = (t: typeof i18next.t) => ({
  [ExpressionPropertyBase.Hidden]: t('right_menu.dynamics_property_hidden'),
  [ExpressionPropertyBase.ReadOnly]: t('right_menu.dynamics_property_read_only'),
  [ExpressionPropertyBase.Required]: t('right_menu.dynamics_property_required'),
  [ExpressionPropertyForGroup.EditAddButton]: t('right_menu.dynamics_group_property_show_add_button'),
  [ExpressionPropertyForGroup.EditSaveAndNextButton]: t('right_menu.dynamics_group_property_show_edit_button'),
  [ExpressionPropertyForGroup.EditDeleteButton]: t('right_menu.dynamics_group_property_show_delete_button'),
  [ExpressionPropertyForGroup.EditSaveButton]: t('right_menu.dynamics_group_property_show_save_button'),
});

export const expressionInPreviewPropertyTexts = (t: typeof i18next.t) => ({
  [ExpressionPropertyBase.Hidden]: t('right_menu.dynamics_property_preview_hidden'),
  [ExpressionPropertyBase.ReadOnly]: t('right_menu.dynamics_property_preview_read_only'),
  [ExpressionPropertyBase.Required]: t('right_menu.dynamics_property_preview_required'),
  [ExpressionPropertyForGroup.EditAddButton]: t('right_menu.dynamics_group_property_preview_show_add_button'),
  [ExpressionPropertyForGroup.EditSaveAndNextButton]: t('right_menu.dynamics_group_property_preview_show_edit_button'),
  [ExpressionPropertyForGroup.EditDeleteButton]: t('right_menu.dynamics_group_property_preview_show_delete_button'),
  [ExpressionPropertyForGroup.EditSaveButton]: t('right_menu.dynamics_group_property_preview_show_save_button'),
});
