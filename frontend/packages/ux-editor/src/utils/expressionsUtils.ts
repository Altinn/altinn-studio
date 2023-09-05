import {
  DataSource,
  Expression, SubExpression,
  ExpressionFunction,
  ExpressionPropertyBase,
  ExpressionPropertyForGroup, isDataSourceWithDropDown,
  Operator
} from '../types/Expressions';
import { v4 as uuidv4 } from 'uuid';
import { deepCopy } from 'app-shared/pure';
import { DatamodelFieldElement } from 'app-shared/types/DatamodelFieldElement';
import { IFormLayouts } from '../types/global';
import { FormComponent } from '../types/FormComponent';

export const convertInternalExpressionToExternal = (expression: Expression): any => {
  if (complexExpressionIsSet(expression.complexExpression)) {
    return expression.complexExpression;
  }
  const expressions: any[] = [];
  expression.subExpressions.map(subEXp => {
    const expressionObject = [];
    expressionObject[0] = subEXp.function;
    if (subEXp.dataSource === DataSource.ApplicationSettings ||
      subEXp.dataSource === DataSource.Component ||
      subEXp.dataSource === DataSource.DataModel ||
      subEXp.dataSource === DataSource.InstanceContext) {
      expressionObject[1] = [subEXp.dataSource, subEXp.value];
    } else if (!subEXp.dataSource) {
      expressionObject[1] = null;
    } else {
      expressionObject[1] = subEXp.value;
    }
    if (subEXp.comparableDataSource === DataSource.ApplicationSettings ||
      subEXp.comparableDataSource === DataSource.Component ||
      subEXp.comparableDataSource === DataSource.DataModel ||
      subEXp.comparableDataSource === DataSource.InstanceContext) {
      expressionObject[2] = [subEXp.comparableDataSource, subEXp.comparableValue];
    } else if (!subEXp.comparableDataSource) {
      expressionObject[2] = null;
    } else {
      expressionObject[2] = subEXp.comparableValue;
    }
    expressions.push(expressionObject);
  });
  return  expression.operator ? [expression.operator].concat(expressions) : expressions[0];
};

export const isStudioFriendlyExpression = (expression: any): boolean => {

  const isStudioFriendlySubExpression = (subExp: any): boolean => {
    // SubExpression is Studio friendly if it is an array of three elements where the two last elements
    // are either an array of two elements or a non-array element. And the first element must be a valid function
    if (Array.isArray(subExp) && subExp.length !== 3) return false;
    if (Array.isArray(subExp[1]) && subExp[1].length !== 2) return false;
    if (Array.isArray(subExp[2]) && subExp[2].length !== 2) return false;
    return (Object.values(ExpressionFunction).includes(subExp[0] as ExpressionFunction));
  };
  // Nested expression
  if (Object.values(Operator).includes(expression[0] as Operator)) {
    for (let i = 1; i < expression.length; i++) {
      if (!isStudioFriendlySubExpression(expression[i])) return false;
    }
    return true;
  }
  else {
    return isStudioFriendlySubExpression(expression);
  }
};

export const convertExternalExpressionToInternal = (booleanValue: string, expression: any): Expression => {

  const hasMoreExpressions: boolean = Object.values(Operator).includes(expression[0] as Operator);
  const convertedExpression: Expression = {
    id: uuidv4(),
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
      id: uuidv4(),
      function: expression[0] as ExpressionFunction,
    }
    const updatedExpAddingValue = convertSubExpression(subExp, expression[1], false);
    convertedExpression.subExpressions.push(convertSubExpression(updatedExpAddingValue, expression[2], true));
    return convertedExpression;
  } else {
    convertedExpression.operator = expression[0];
    expression.slice(1).map(expEl => {
        const exp: SubExpression = {
          id: uuidv4(),
          function: expEl[0] as ExpressionFunction, // might need an error handling if function is invalid
        }
        const updatedExpAddingValue = convertSubExpression(exp, expEl[1], false);
      convertedExpression.subExpressions.push(convertSubExpression(updatedExpAddingValue, expEl[2], true));
      }
    );
    return convertedExpression;
  }
};

export function convertSubExpression(internalExpEl: SubExpression, externalExpEl: any, isComparable: boolean): SubExpression {
  const newInternalExpEl = deepCopy(internalExpEl);
  if (Array.isArray(externalExpEl)) {
    isComparable ? newInternalExpEl.comparableDataSource = externalExpEl[0] as DataSource : newInternalExpEl.dataSource = externalExpEl[0] as DataSource;
    isComparable ? newInternalExpEl.comparableValue = externalExpEl[1] : newInternalExpEl.value = externalExpEl[1];
  } else if (!externalExpEl) {
    isComparable ? newInternalExpEl.comparableDataSource = DataSource.Null : newInternalExpEl.dataSource = DataSource.Null;
    isComparable ? newInternalExpEl.comparableValue = null : newInternalExpEl.value = null;
  } else {
    isComparable ? newInternalExpEl.comparableDataSource = (typeof externalExpEl as DataSource) : newInternalExpEl.dataSource = (typeof externalExpEl as DataSource); // to string. Can be string, number, boolean
    isComparable ? newInternalExpEl.comparableValue = externalExpEl : newInternalExpEl.value = externalExpEl;
  }
  return newInternalExpEl;
}

export const convertAndAddExpressionToComponent = (form, formId, expression: Expression): FormComponent => {
  const newFrom = deepCopy(form);
  let newExpression = deepCopy(expression);
  if (complexExpressionIsSet(newExpression.complexExpression)) {
    const parsedExpression = tryParseExpression(newExpression, newExpression.complexExpression);
    newExpression = { ...parsedExpression };
  }
  if (newExpression.property) {
    // TODO: What if expression is invalid format? Have some way to validate with app-frontend dev-tools. Issue #10859
    newFrom[newExpression.property] = convertInternalExpressionToExternal(newExpression);
    return newFrom;
  }
};

export const addExpressionIfLimitNotReached = (oldExpressions: Expression[], isExpressionLimitReached: boolean): Expression[] => {
  const newExpressions = deepCopy(oldExpressions);
  const newExpression: Expression = { id: uuidv4(), subExpressions: [] };
  return isExpressionLimitReached ? newExpressions : newExpressions.concat(newExpression);
};

export const deleteExpressionAndAddDefaultIfEmpty = (form, expressionToDelete: Expression, oldExpressions: Expression[]): {newForm: FormComponent, updatedExpressions:Expression[]} => {
  const newForm = deepCopy(form);
  const newExpressions = deepCopy(oldExpressions);
  let updatedExpressions = newExpressions;
  if (expressionToDelete.property) {
    // TODO: What if the property was set to true or false before? Issue #10860
    delete newForm[expressionToDelete.property];
    updatedExpressions = newExpressions.filter(prevExpression => prevExpression.id !== expressionToDelete.id);
    if (updatedExpressions.length === 0) {
      const defaultExpression: Expression = { id: uuidv4(), subExpressions: [] };
      updatedExpressions = [defaultExpression];
    }
  }
  return { newForm, updatedExpressions };
};

export const removeInvalidExpressions = (oldExpressions: Expression[]): Expression[] => {
  const newExpressions = deepCopy(oldExpressions);
  return newExpressions.filter(prevExpression => prevExpression.property || complexExpressionIsSet(prevExpression.complexExpression));
};

export const addProperty = (oldExpression: Expression, property: string): Expression => {
  if (property === 'default') {
    return;
  }
  const newExpression = deepCopy(oldExpression);
  newExpression.property = property as ExpressionPropertyBase;
  if (newExpression.subExpressions.length === 0) {
    const newSubExpression: SubExpression = { id: uuidv4() };
    newExpression.subExpressions.push(newSubExpression);
  }
  return newExpression;
};

export const addSubExpressionToExpression = (oldExpression: Expression, operator: Operator): Expression => {
  const newExpression = deepCopy(oldExpression);
  const newSubExpression: SubExpression = { id: uuidv4() };
  newExpression.subExpressions.push(newSubExpression);
  newExpression.operator = operator;
  return newExpression;
};

export const updateOperator = (oldExpression: Expression, operator: Operator): Expression => {
  const newExpression = deepCopy(oldExpression);
  newExpression.operator = operator;
  return newExpression;
};

export const updateExpression = (oldExpression: Expression, index: number, subExpression: SubExpression) => {
  const newExpression = deepCopy(oldExpression);
  newExpression.subExpressions[index] = { id: uuidv4(), ...subExpression };
  return newExpression;
};

export const updateComplexExpression = (oldExpression: Expression, complexExpression: any): Expression => {
  const newExpression = deepCopy(oldExpression);
  newExpression.complexExpression = complexExpression;
  return newExpression;
};

export const removeSubExpressionAndAdaptParentProps = (oldExpression: Expression, subExpression: SubExpression) => {
  const newExpression = deepCopy(oldExpression);
  const updatedSubExpressions = newExpression.subExpressions.filter((expEl: SubExpression) => expEl.id !== subExpression.id);
  if (updatedSubExpressions.length === 0) {
    delete newExpression.operator;
    delete newExpression.property;
    delete newExpression.subExpressions;
    return newExpression;
  } else if (updatedSubExpressions.length === 1) {
    delete newExpression.operator;
  }
  newExpression.subExpressions = updatedSubExpressions;
  return newExpression;
};

export const addDataSource = (expEl: SubExpression, dataSource: string, isComparable: boolean ) => {
  const newExpEl = deepCopy(expEl);
  if (dataSource === 'default') {
    isComparable ? delete newExpEl.comparableDataSource : delete newExpEl.dataSource;
    isComparable ? delete newExpEl.comparableValue : delete newExpEl.value;
  }
  else {
    if (isComparable ? newExpEl.comparableDataSource !== dataSource : newExpEl.dataSource !== dataSource) {
      if (isDataSourceWithDropDown(dataSource as DataSource)) {
        isComparable ? newExpEl.comparableValue = 'default' : newExpEl.value = 'default';
      }
      else {
        isComparable ? delete newExpEl.comparableValue : delete newExpEl.value;
      }
    }
    isComparable ? newExpEl.comparableDataSource = dataSource as DataSource : newExpEl.dataSource = dataSource as DataSource;
    if (dataSource === DataSource.Null) {
      isComparable ? newExpEl.comparableValue = null : newExpEl.value = null;
    }
  }
  return newExpEl;
};

export const addDataSourceValue = (expEl: SubExpression, dataSourceValue: string, isComparable: boolean) => {
  const newExpEl = deepCopy(expEl);
  // TODO: Remove check for 'NotImplementedYet' when applicationSettings can be retrieved. Issue #10856
  if (dataSourceValue === 'default' || dataSourceValue === 'NotImplementedYet') {
    isComparable ? delete newExpEl.comparableValue : delete newExpEl.value;
  } else {
    isComparable ? newExpEl.comparableValue = dataSourceValue : newExpEl.value = dataSourceValue;
  }
  return newExpEl;
};

export const tryParseExpression = (oldExpression: Expression, complexExpression: string) => {
  // TODO: Try format expression for better readability
  const newExpression = deepCopy(oldExpression);
  try {
    newExpression.complexExpression = JSON.parse(complexExpression);
  } catch (error) {
    newExpression.complexExpression = complexExpression;
  }
  return newExpression;
};

export const complexExpressionIsSet = (complexExpression: string) => {
  // ComplexExpression can be empty string
  return complexExpression !== undefined && complexExpression !== null;
};

// TODO: Make sure all data model fields are included - what if there are multiple data models? . Issue #10855
export const getDataModelElementNames = (dataModelElements: DatamodelFieldElement[]) => {
  return dataModelElements
    .filter(element => element.dataBindingName)
    .map((element) => ({
      value: element.dataBindingName,
      label: element.dataBindingName,
    }))
};

export const getComponentIds = (formLayouts: IFormLayouts) => {
  // TODO: Make sure all components from the layout set are included, also those inside groups. Issue #10855
  const components = Object.values(formLayouts).flatMap(layout => Object.values(layout.components));
  // TODO: Make sure there are not duplicate component ids. Related issue: 10857
  return Object.values(components).map((comp: FormComponent) => ({
    value: comp.id,
    label: comp.id,
  }));
};
