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
import { DatamodelFieldElement } from "app-shared/types/DatamodelFieldElement";
import { IFormLayouts } from "../types/global";
import { FormComponent } from "../types/FormComponent";

export const convertExpressionToExternalFormat = (expression: Expression): any => {
  if (complexExpressionIsSet(expression.complexExpression)) {
    return expression.complexExpression;
  }
  const expressions: any[] = [];
  expression.subExpressions.map(expression => {
    const expressionObject = [];
    expressionObject[0] = expression.function;
    if (expression.dataSource === DataSource.ApplicationSettings ||
      expression.dataSource === DataSource.Component ||
      expression.dataSource === DataSource.DataModel ||
      expression.dataSource === DataSource.InstanceContext) {
      expressionObject[1] = [expression.dataSource, expression.value];
    } else {
      expressionObject[1] = expression.value;
    }
    if (expression.comparableDataSource === DataSource.ApplicationSettings ||
      expression.comparableDataSource === DataSource.Component ||
      expression.comparableDataSource === DataSource.DataModel ||
      expression.comparableDataSource === DataSource.InstanceContext) {
      expressionObject[2] = [expression.comparableDataSource, expression.comparableValue];
    } else {
      expressionObject[2] = expression.comparableValue;
    }
    expressions.push(expressionObject);
  });
  return expression.operator ? [expression.operator].concat(expressions) : expressions[0];
};

export const convertExternalExpressionToInternal = (booleanValue: string, expression: any): Expression => {

  const validOperatorOrFunction = (operatorOrFunction: string): boolean => {
    return (Object.values(Operator).includes(operatorOrFunction as Operator) || Object.values(ExpressionFunction).includes(operatorOrFunction as ExpressionFunction));
  }

  const hasMoreExpressions: boolean = Object.values(Operator).includes(expression[0] as Operator);
  const convertedExpression: Expression = {
    id: uuidv4(),
    property: booleanValue as ExpressionPropertyBase | ExpressionPropertyForGroup,
    subExpressions: [],
  };

  // Fall back to complex expression if:
  // 1. Expression does not start with an operator or a function, or
  // 2. Expression does not starts with an operator, but has two elements
  // (Studio will only be able to visualize expressions that does not match any of the above conditions)
  if (!validOperatorOrFunction(expression[0]) || (!Object.values(Operator).includes(expression[0]) && expression.length === 2)) {
    delete convertedExpression.subExpressions;
    convertedExpression.complexExpression = expression;
    return convertedExpression;
  }

  if (!hasMoreExpressions) {
    const subExp: SubExpression = {
      id: uuidv4(),
      function: expression[0] as ExpressionFunction, // might need an error handling if function is invalid
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

function convertSubExpression(internalExpEl: SubExpression, externalExpEl: any, isComparable: boolean): SubExpression {
  if (Array.isArray(externalExpEl)) {
    isComparable ? internalExpEl.comparableDataSource = externalExpEl[0] as DataSource : internalExpEl.dataSource = externalExpEl[0] as DataSource;
    isComparable ? internalExpEl.comparableValue = externalExpEl[1] : internalExpEl.value = externalExpEl[1];
  } else {
    isComparable ? internalExpEl.comparableDataSource = (typeof externalExpEl as DataSource) : internalExpEl.dataSource = (typeof externalExpEl as DataSource) // to string. Can be string, number, boolean or null
    isComparable ? internalExpEl.comparableValue = externalExpEl : internalExpEl.value = externalExpEl;
  }
  return internalExpEl;
}

export const saveExpression = async (form, formId, expression: Expression, updateFormComponent) => {
  let newExpression = deepCopy(expression);
  if (complexExpressionIsSet(newExpression.complexExpression)) {
    const parsedExpression = tryParseExpression(newExpression, newExpression.complexExpression);
    newExpression = { ...parsedExpression };
  }
  if (newExpression.property) {
    // TODO: What if expression is invalid format? Have some way to validate with app-frontend dev-tools. Issue #10859
    form[newExpression.property] = convertExpressionToExternalFormat(newExpression);
    await updateFormComponent({ updatedComponent: form as FormComponent, id: formId });
  }
};

export const addExpressionIfLimitNotReached = (oldExpressions: Expression[], isExpressionLimitReached: boolean): Expression[] => {
  const newExpressions = deepCopy(oldExpressions);
  const newExpression: Expression = { id: uuidv4(), subExpressions: [] };
  return isExpressionLimitReached ? newExpressions : newExpressions.concat(newExpression);
};

export const deleteExpressionAndAddDefaultIfEmpty = async (form, formId, expressionToDelete: Expression, oldExpressions: Expression[], updateFormComponent): Promise<Expression[]> => {
  const newExpressions = deepCopy(oldExpressions);
  if (expressionToDelete.property) {
    // TODO: What if the property was set to true or false before? Issue #10860
    delete form[expressionToDelete.property];
    await updateFormComponent({ updatedComponent: form as FormComponent, id: formId });
  }
  let updatedExpressions = newExpressions.filter(prevExpression => prevExpression.id !== expressionToDelete.id);
  if (updatedExpressions.length === 0) {
    const defaultExpression: Expression = { id: uuidv4(), subExpressions: [] };
    updatedExpressions = [defaultExpression];
  }
  return updatedExpressions;
};

export const removeInvalidExpressions = (oldExpressions: Expression[]): Expression[] => {
  const newExpressions = deepCopy(oldExpressions);
  return newExpressions.filter(prevExpression => prevExpression.property || complexExpressionIsSet(prevExpression.complexExpression));
};

export const addAction = (oldExpression: Expression, action: string): Expression => {
  if (action === 'default') {
    return;
  }
  const newExpression = deepCopy(oldExpression);
  newExpression.property = action as ExpressionPropertyBase;
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
      isComparable ? delete newExpEl.comparableValue : delete newExpEl.value;
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
