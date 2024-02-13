import type { RelationalOperator } from '../../../../types/RelationalOperator';
import type { SimpleSubExpression } from '../../../../types/SimpleSubExpression';
import type { SimpleSubExpressionValue } from '../../../../types/SimpleSubExpressionValue';

export const changeRelationalOperator = (
  expression: SimpleSubExpression,
  operator: RelationalOperator,
): SimpleSubExpression => ({
  ...expression,
  relationalOperator: operator,
});

export const changeFirstOperand = (
  expression: SimpleSubExpression,
  value: SimpleSubExpressionValue,
): SimpleSubExpression => ({
  ...expression,
  firstOperand: value,
});

export const changeSecondOperand = (
  expression: SimpleSubExpression,
  value: SimpleSubExpressionValue,
): SimpleSubExpression => ({
  ...expression,
  secondOperand: value,
});
