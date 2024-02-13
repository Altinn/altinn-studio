import type { SimpleLogicalExpression } from '../types/SimplifiedExpression';
import type { LogicalTupleOperator } from '../enums/LogicalTupleOperator';
import type { SimpleSubExpression } from '../types/SimpleSubExpression';
import { ArrayUtils } from '@studio/pure-functions';
import { DEFAULT_SUBEXPRESSION } from '../config';

export const changeOperator = (
  expression: SimpleLogicalExpression,
  newOperator: LogicalTupleOperator,
): SimpleLogicalExpression => ({
  ...expression,
  logicalOperator: newOperator,
});

export const addDefaultSubExpression = (
  expression: SimpleLogicalExpression,
): SimpleLogicalExpression => addSubExpression(expression, DEFAULT_SUBEXPRESSION);

const addSubExpression = (
  expression: SimpleLogicalExpression,
  newSubExpression: SimpleSubExpression,
): SimpleLogicalExpression => {
  const newExpressions = [...expression.subExpressions, newSubExpression];
  return changeSubExpressions(expression, newExpressions);
};

export const changeSubExpressions = (
  expression: SimpleLogicalExpression,
  newSubExpressions: SimpleSubExpression[],
): SimpleLogicalExpression => ({
  ...expression,
  subExpressions: newSubExpressions,
});

export const changeSubExpression = (
  subExpressions: SimpleSubExpression[],
  index: number,
  newSubExpression: SimpleSubExpression,
): SimpleSubExpression[] => ArrayUtils.replaceByIndex(subExpressions, index, newSubExpression);

export const deleteSubExpression = (
  subExpressions: SimpleSubExpression[],
  index: number,
): SimpleSubExpression[] => ArrayUtils.removeItemByIndex(subExpressions, index);
