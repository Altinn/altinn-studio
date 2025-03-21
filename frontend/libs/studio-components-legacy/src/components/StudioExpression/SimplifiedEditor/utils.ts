import type { SimpleLogicalExpression } from '../types/SimplifiedExpression';
import type { LogicalTupleOperator } from '../enums/LogicalTupleOperator';
import type { SimpleSubexpression } from '../types/SimpleSubexpression';
import { ArrayUtils } from '@studio/pure-functions';
import { DEFAULT_SUBEXPRESSION } from '../config';

export const changeOperator = (
  expression: SimpleLogicalExpression,
  newOperator: LogicalTupleOperator,
): SimpleLogicalExpression => ({
  ...expression,
  logicalOperator: newOperator,
});

export const addDefaultSubexpression = (
  expression: SimpleLogicalExpression,
): SimpleLogicalExpression => addSubexpression(expression, DEFAULT_SUBEXPRESSION);

const addSubexpression = (
  expression: SimpleLogicalExpression,
  newSubexpression: SimpleSubexpression,
): SimpleLogicalExpression => {
  const newExpressions = [...expression.subexpressions, newSubexpression];
  return changeSubexpressions(expression, newExpressions);
};

export const changeSubexpressions = (
  expression: SimpleLogicalExpression,
  newSubexpressions: SimpleSubexpression[],
): SimpleLogicalExpression => ({
  ...expression,
  subexpressions: newSubexpressions,
});

export const changeSubexpression = (
  subexpressions: SimpleSubexpression[],
  index: number,
  newSubexpression: SimpleSubexpression,
): SimpleSubexpression[] => ArrayUtils.replaceByIndex(subexpressions, index, newSubexpression);

export const deleteSubexpression = (
  subexpressions: SimpleSubexpression[],
  index: number,
): SimpleSubexpression[] => ArrayUtils.removeItemByIndex(subexpressions, index);
