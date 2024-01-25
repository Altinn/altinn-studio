import type {
  Expression,
  ExpressionProperty,
  ExpressionPropertyBase,
  SubExpression,
} from '../types/Expressions';
import {
  DataSource,
  ExpressionFunction,
  ExpressionPropertyForGroup,
  getExpressionPropertiesBasedOnComponentType,
  Operator,
} from '../types/Expressions';
import { deepCopy } from 'app-shared/pure';
import type { DatamodelFieldElement } from 'app-shared/types/DatamodelFieldElement';
import type { IFormLayouts } from '../types/global';
import { LayoutItemType } from '../types/global';
import type { FormComponent } from '../types/FormComponent';
import type { LegacySingleSelectOption } from '@digdir/design-system-react';
import type { FormContainer } from '../types/FormContainer';
import type { UseText } from '../hooks';

export const convertInternalExpressionToExternal = (expression: Expression): any => {
  if (complexExpressionIsSet(expression.complexExpression)) {
    return expression.complexExpression;
  }
  if (!expression.subExpressions || expression.subExpressions.length === 0) {
    return [];
  }
  if (expression.subExpressions.length === 1) {
    return convertInternalSubExpressionToExternal(expression.subExpressions[0]);
  }
  const multiExpression: any = [expression.operator];
  expression.subExpressions.map((subExp) => {
    const convertedSubExpression = convertInternalSubExpressionToExternal(subExp);
    multiExpression.push(convertedSubExpression);
  });
  return multiExpression;
};

export const convertInternalSubExpressionToExternal = (subExp: SubExpression): any => {
  const expressionObject: any = [subExp.function];
  if (
    subExp.dataSource === DataSource.ApplicationSettings ||
    subExp.dataSource === DataSource.Component ||
    subExp.dataSource === DataSource.DataModel ||
    subExp.dataSource === DataSource.InstanceContext
  ) {
    expressionObject[1] = [subExp.dataSource, subExp.value];
  } else if (!subExp.dataSource) {
    expressionObject[1] = null;
  } else {
    expressionObject[1] = subExp.value;
  }
  if (
    subExp.comparableDataSource === DataSource.ApplicationSettings ||
    subExp.comparableDataSource === DataSource.Component ||
    subExp.comparableDataSource === DataSource.DataModel ||
    subExp.comparableDataSource === DataSource.InstanceContext
  ) {
    expressionObject[2] = [subExp.comparableDataSource, subExp.comparableValue];
  } else if (!subExp.comparableDataSource) {
    expressionObject[2] = null;
  } else {
    expressionObject[2] = subExp.comparableValue;
  }
  return expressionObject;
};

export const isStudioFriendlyExpression = (expression: any): boolean => {
  if (!expression[0]) {
    // For building expressions free style from beginning
    return true;
  }

  const isStudioFriendlySubExpression = (subExp: any): boolean => {
    // SubExpression is Studio friendly if it is an array of three elements where the two last elements
    // are either an array of two elements or a non-array element. And the first element must be a valid function
    if (Array.isArray(subExp) && subExp.length !== 3) return false;
    if (Array.isArray(subExp[1]) && subExp[1].length !== 2) return false;
    if (Array.isArray(subExp[2]) && subExp[2].length !== 2) return false;
    return Object.values(ExpressionFunction).includes(subExp[0] as ExpressionFunction);
  };
  // Nested expression
  if (Object.values(Operator).includes(expression[0] as Operator)) {
    for (let i = 1; i < expression.length; i++) {
      if (!isStudioFriendlySubExpression(expression[i])) return false;
    }
    return true;
  } else {
    return isStudioFriendlySubExpression(expression);
  }
};

export const convertExternalExpressionToInternal = (
  booleanValue: string,
  expression: any,
): Expression => {
  const hasMoreExpressions: boolean = Object.values(Operator).includes(expression[0] as Operator);
  const convertedExpression: Expression = {
    property: booleanValue as ExpressionPropertyBase | ExpressionPropertyForGroup,
    subExpressions: [],
  };

  if (!isStudioFriendlyExpression(expression)) {
    delete convertedExpression.subExpressions;
    convertedExpression.complexExpression = expression;
    return convertedExpression;
  }

  if (!hasMoreExpressions) {
    const subExp: SubExpression = {
      function: expression[0] as ExpressionFunction,
    };
    const updatedExpAddingValue = convertSubExpression(subExp, expression[1], false);
    convertedExpression.subExpressions.push(
      convertSubExpression(updatedExpAddingValue, expression[2], true),
    );
    return convertedExpression;
  } else {
    convertedExpression.operator = expression[0] as Operator;
    expression.slice(1).map((expEl) => {
      const exp: SubExpression = {
        function: expEl[0] as ExpressionFunction,
      };
      const updatedExpAddingValue = convertSubExpression(exp, expEl[1], false);
      convertedExpression.subExpressions.push(
        convertSubExpression(updatedExpAddingValue, expEl[2], true),
      );
    });
    return convertedExpression;
  }
};

export function convertSubExpression(
  internalSubExp: SubExpression,
  externalExpEl: any,
  isComparable: boolean,
): SubExpression {
  const newInternalSubExp = deepCopy(internalSubExp);
  if (Array.isArray(externalExpEl)) {
    isComparable
      ? (newInternalSubExp.comparableDataSource = externalExpEl[0] as DataSource)
      : (newInternalSubExp.dataSource = externalExpEl[0] as DataSource);
    isComparable
      ? (newInternalSubExp.comparableValue = externalExpEl[1])
      : (newInternalSubExp.value = externalExpEl[1]);
  } else if (externalExpEl === null) {
    isComparable
      ? (newInternalSubExp.comparableDataSource = DataSource.Null)
      : (newInternalSubExp.dataSource = DataSource.Null);
    isComparable ? (newInternalSubExp.comparableValue = null) : (newInternalSubExp.value = null);
  } else {
    isComparable
      ? (newInternalSubExp.comparableDataSource = typeof externalExpEl as DataSource)
      : (newInternalSubExp.dataSource = typeof externalExpEl as DataSource); // to string. Can be string, number, boolean
    isComparable
      ? (newInternalSubExp.comparableValue = externalExpEl)
      : (newInternalSubExp.value = externalExpEl);
  }
  return newInternalSubExp;
}

export const convertAndAddExpressionToComponent = (
  form,
  expression: Expression,
): FormComponent | FormContainer => {
  const newForm = deepCopy(form);
  let newExpression = deepCopy(expression);
  if (complexExpressionIsSet(newExpression.complexExpression)) {
    const parsedExpression = tryParseExpression(newExpression, newExpression.complexExpression);
    newExpression = { ...parsedExpression };
  }
  if (newExpression.property) {
    // TODO: What if expression is invalid format? Have some way to validate with app-frontend dev-tools. Issue #10859
    if (form.itemType === LayoutItemType.Container && newExpression.property.includes('edit.')) {
      const editPropertyForGroup = newExpression.property.split('edit.')[1];
      newForm['edit'][editPropertyForGroup] = convertInternalExpressionToExternal(newExpression);
    } else {
      newForm[newExpression.property] = convertInternalExpressionToExternal(newExpression);
    }
  }
  return newForm;
};

export const deleteExpressionFromPropertyOnComponent = (
  form,
  property: ExpressionProperty,
): FormComponent | FormContainer => {
  const newForm = deepCopy(form);
  // TODO: What if the property was set to true or false before? Issue #10860
  delete newForm[property];
  return newForm;
};

export const addPropertyForExpression = (
  oldProperties: ExpressionProperty[],
  property: ExpressionProperty,
): ExpressionProperty[] => {
  return [...oldProperties, property];
};

export const deleteExpression = (
  expressionToDelete: Expression,
  expressions: Expression[],
): Expression[] =>
  expressions.filter((expression) => expression.property !== expressionToDelete.property);

export const addPropertyToExpression = (
  oldExpression: Expression,
  property: string,
): Expression => {
  const newExpression = deepCopy(oldExpression);
  if (property === 'default') {
    return newExpression;
  }
  newExpression.property = property as ExpressionProperty;
  return newExpression;
};

export const addFunctionToSubExpression = (
  oldSubExpression: SubExpression,
  func: string,
): SubExpression => {
  const newSubExpression = deepCopy(oldSubExpression);
  if (func === 'default') {
    delete newSubExpression.function;
    return newSubExpression;
  }
  newSubExpression.function = func as ExpressionFunction;
  return newSubExpression;
};

export const addSubExpressionToExpression = (
  oldExpression: Expression,
  operator: Operator,
): Expression => {
  const newExpression = deepCopy(oldExpression);
  const newSubExpression: SubExpression = {};
  if (!newExpression.subExpressions) {
    newExpression.subExpressions = [newSubExpression];
    return newExpression;
  }
  if (newExpression.subExpressions.length > 0) {
    newExpression.operator = operator;
  }
  newExpression.subExpressions.push(newSubExpression);
  return newExpression;
};

export const updateOperatorOnExpression = (
  oldExpression: Expression,
  operator: Operator,
): Expression => {
  const newExpression = deepCopy(oldExpression);
  newExpression.operator = operator;
  return newExpression;
};

export const updateSubExpressionOnExpression = (
  oldExpression: Expression,
  index: number,
  subExpression: SubExpression,
): Expression => {
  const newExpression = deepCopy(oldExpression);
  newExpression.subExpressions[index] = subExpression;
  return newExpression;
};

export const updateComplexExpressionOnExpression = (
  oldExpression: Expression,
  complexExpression: any,
): Expression => {
  const newExpression = deepCopy(oldExpression);
  newExpression.complexExpression = complexExpression;
  return newExpression;
};

export const removeSubExpression = (
  oldExpression: Expression,
  subExpression: SubExpression,
): Expression => {
  const newExpression = deepCopy(oldExpression);
  newExpression.subExpressions = oldExpression.subExpressions.filter(
    (expEl: SubExpression) => expEl !== subExpression,
  );
  if (newExpression.subExpressions.length < 2) {
    delete newExpression.operator;
  }
  return newExpression;
};

export const addDataSourceToSubExpression = (
  expEl: SubExpression,
  dataSource: string,
  isComparable: boolean,
): SubExpression => {
  const newExpEl = deepCopy(expEl);
  if (dataSource === 'default') {
    isComparable ? delete newExpEl.comparableDataSource : delete newExpEl.dataSource;
    isComparable ? delete newExpEl.comparableValue : delete newExpEl.value;
  } else if (
    isComparable ? newExpEl.comparableDataSource === dataSource : newExpEl.dataSource === dataSource
  ) {
    isComparable ? delete newExpEl.comparableValue : delete newExpEl.value;
  } else {
    // If none of the above statements applies - set datasource and adapt value accordingly
    isComparable
      ? (newExpEl.comparableDataSource = dataSource)
      : (newExpEl.dataSource = dataSource);
    if (dataSource === DataSource.Boolean) {
      isComparable ? (newExpEl.comparableValue = true) : (newExpEl.value = true);
    } else {
      isComparable ? delete newExpEl.comparableValue : delete newExpEl.value;
    }
  }
  return newExpEl;
};

export const addDataSourceValueToSubExpression = (
  expEl: SubExpression,
  dataSourceValue: string,
  isComparable: boolean,
): SubExpression => {
  const newExpEl = deepCopy(expEl);
  // TODO: Remove check for 'NotImplementedYet' when applicationSettings can be retrieved. Issue #10856
  if (dataSourceValue === 'default' || dataSourceValue === 'NotImplementedYet') {
    isComparable ? delete newExpEl.comparableValue : delete newExpEl.value;
  } else if (
    isComparable
      ? expEl.comparableDataSource === DataSource.Boolean
      : expEl.dataSource === DataSource.Boolean
  ) {
    isComparable
      ? (newExpEl.comparableValue = dataSourceValue === 'true')
      : (newExpEl.value = dataSourceValue === 'true');
  } else if (
    isComparable
      ? expEl.comparableDataSource === DataSource.Number
      : expEl.dataSource === DataSource.Number
  ) {
    isComparable
      ? (newExpEl.comparableValue = parseFloat(dataSourceValue))
      : (newExpEl.value = parseFloat(dataSourceValue));
  } else {
    isComparable
      ? (newExpEl.comparableValue = dataSourceValue)
      : (newExpEl.value = dataSourceValue);
  }
  return newExpEl;
};

export const stringifyValueForDisplay = (
  t: UseText,
  dataSourceValue: string | boolean | number | undefined | null,
): string => {
  if (dataSourceValue === null || dataSourceValue === undefined) {
    return 'null';
  } else if (typeof dataSourceValue === 'boolean') {
    return dataSourceValue ? t('general.true') : t('general.false');
  }
  return dataSourceValue.toString();
};

export const tryParseExpression = (
  oldExpression: Expression,
  complexExpression: any,
): Expression => {
  // TODO: Try format expression for better readability
  const newExpression = deepCopy(oldExpression);
  try {
    newExpression.complexExpression = JSON.parse(complexExpression as string);
  } catch (error) {
    newExpression.complexExpression = complexExpression;
  }
  return newExpression;
};

export const complexExpressionIsSet = (complexExpression: string): boolean => {
  // ComplexExpression can be empty string
  return complexExpression !== undefined && complexExpression !== null;
};

export const canExpressionBeSaved = (expression: Expression): boolean => {
  const allSubExpressionsHaveFunctions: boolean =
    expression.subExpressions?.length > 0 &&
    expression.subExpressions.every((subExp) => subExp.function);
  const expressionHasProperty: boolean = !!expression.property;
  const expressionIsComplex: boolean = complexExpressionIsSet(expression.complexExpression);
  return expressionHasProperty && (allSubExpressionsHaveFunctions || expressionIsComplex);
};

export const getAllComponentPropertiesThatCanHaveExpressions = (
  form: FormComponent | FormContainer,
): ExpressionProperty[] => {
  const expressionProperties = getExpressionPropertiesBasedOnComponentType(
    form.itemType as LayoutItemType,
  );
  let editPropertiesForGroup: ExpressionProperty[] = [];
  if (form['edit']) {
    editPropertiesForGroup = Object.keys(form['edit'])
      .map((property) => 'edit.' + property)
      .filter(canGroupPropertyHaveExpressions);
  }
  const generalComponentPropertiesThatCanHaveExpressions: ExpressionProperty[] = Object.keys(
    form,
  ).filter((property) =>
    expressionProperties?.includes(property as ExpressionProperty),
  ) as ExpressionProperty[];
  return generalComponentPropertiesThatCanHaveExpressions.concat(editPropertiesForGroup);
};

const canGroupPropertyHaveExpressions = (property: string): property is ExpressionProperty =>
  Object.values(ExpressionPropertyForGroup).includes(property as ExpressionPropertyForGroup);

export const getPropertiesWithExistingExpression = (
  form: FormComponent | FormContainer,
  availableProperties: ExpressionProperty[],
): ExpressionProperty[] => {
  return availableProperties.filter(
    (property) => getExternalExpressionOnComponentProperty(form, property) !== undefined,
  );
};

export const getExternalExpressionOnComponentProperty = (
  form: FormComponent | FormContainer,
  property: ExpressionProperty,
): any => {
  let value = form[property];
  if (form.itemType === 'CONTAINER' && property.includes('edit')) {
    const editPropertyForGroup = property.split('edit.')[1];
    value = form['edit'][editPropertyForGroup];
  }
  return typeof value !== 'boolean' ? value : undefined;
};

export const getNonOverlappingElementsFromTwoLists = (list1: any[], list2: any[]): any[] => {
  return list1.filter((item) => !list2.includes(item));
};

// TODO: Make sure all data model fields are included - what if there are multiple data models? . Issue #10855
export const getDataModelElementNames = (
  dataModelElements: DatamodelFieldElement[],
): LegacySingleSelectOption[] => {
  return dataModelElements
    .filter((element) => element.dataBindingName)
    .map((element) => ({
      value: element.dataBindingName,
      label: element.dataBindingName,
    }));
};

export const getComponentIds = (formLayouts: IFormLayouts): LegacySingleSelectOption[] => {
  // TODO: Make sure all components from the layout set are included, also those inside groups. Issue #10855
  const components = Object.values(formLayouts).flatMap((layout) =>
    Object.values(layout.components),
  );
  // TODO: Make sure there are not duplicate component ids. Related issue: 10857
  return Object.values(components).map((comp: FormComponent) => ({
    value: comp.id,
    label: comp.id,
  }));
};
