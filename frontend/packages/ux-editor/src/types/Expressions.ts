
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
