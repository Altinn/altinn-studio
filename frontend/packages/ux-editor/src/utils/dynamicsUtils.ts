import {
  DataSource,
  Dynamic, ExpressionElement,
  ExpressionFunction,
  ExpressionPropertyBase,
  ExpressionPropertyForGroup,
  Operator
} from '../types/Expressions';
import { v4 as uuidv4 } from 'uuid';

export const convertDynamicToExternalFormat = (dynamic: Dynamic): any => {
  if (dynamic.complexExpression) {
    return dynamic.complexExpression;
  }
  const expressions: any[] = [];
  dynamic.expressionElements.map(expression => {
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
  return dynamic.operator ? [dynamic.operator].concat(expressions) : expressions[0];
};

export const convertExternalDynamicToInternal = (booleanValue: string, dynamic: any): Dynamic => {

  const validOperatorOrFunction = (operatorOrFunction: string): boolean => {
    return (Object.values(Operator).includes(operatorOrFunction as Operator) || Object.values(ExpressionFunction).includes(operatorOrFunction as ExpressionFunction));
  }

  const hasMoreExpressions: boolean = Object.values(Operator).includes(dynamic[0] as Operator);
  const convertedDynamic: Dynamic = {
    id: uuidv4(),
    editMode: false,
    property: booleanValue as ExpressionPropertyBase | ExpressionPropertyForGroup,
    expressionElements: [],
  };

  // Fall back to complex expression if:
  // 1. Expression does not start with an operator or a function, or
  // 2. Expression does not starts with an operator, but has two elements
  // (Studio will only be able to visualize expressions that does not match any of the above conditions)
  if (!validOperatorOrFunction(dynamic[0]) || (!Object.values(Operator).includes(dynamic[0]) && dynamic.length === 2)) {
    delete convertedDynamic.expressionElements;
    convertedDynamic.complexExpression = dynamic;
    return convertedDynamic;
  }

  if (!hasMoreExpressions) {
    const exp: ExpressionElement = {
      id: uuidv4(),
      function: dynamic[0] as ExpressionFunction, // might need an error handling if function is invalid
    }
    const updatedExpAddingValue = convertExpressionElement(exp, dynamic[1], false);
    convertedDynamic.expressionElements.push(convertExpressionElement(updatedExpAddingValue, dynamic[2], true));
    return convertedDynamic;
  } else {
    convertedDynamic.operator = dynamic[0];
    dynamic.slice(1).map(expEl => {
        const exp: ExpressionElement = {
          id: uuidv4(),
          function: expEl[0] as ExpressionFunction, // might need an error handling if function is invalid
        }
        const updatedExpAddingValue = convertExpressionElement(exp, expEl[1], false);
        convertedDynamic.expressionElements.push(convertExpressionElement(updatedExpAddingValue, expEl[2], true));
      }
    );
    return convertedDynamic;
  }
}

function convertExpressionElement(internalExpEl: ExpressionElement, externalExpEl: any, isComparable: boolean): ExpressionElement {
  if (Array.isArray(externalExpEl)) {
    isComparable ? internalExpEl.comparableDataSource = externalExpEl[0] as DataSource : internalExpEl.dataSource = externalExpEl[0] as DataSource;
    isComparable ? internalExpEl.comparableValue = externalExpEl[1] : internalExpEl.value = externalExpEl[1];
  } else {
    isComparable ? internalExpEl.comparableDataSource = (typeof externalExpEl as DataSource) : internalExpEl.dataSource = (typeof externalExpEl as DataSource) // to string. Can be string, number, boolean or null
    isComparable ? internalExpEl.comparableValue = externalExpEl : internalExpEl.value = externalExpEl;
  }
  return internalExpEl;
}
