import type { RelationalOperator } from '../../../../types/RelationalOperator';
import type { SimpleSubexpression } from '../../../../types/SimpleSubexpression';
import type { SimpleSubexpressionValue } from '../../../../types/SimpleSubexpressionValue';

export const changeRelationalOperator = (
  expression: SimpleSubexpression,
  operator: RelationalOperator,
): SimpleSubexpression => ({
  ...expression,
  relationalOperator: operator,
});

export const changeFirstOperand = (
  expression: SimpleSubexpression,
  value: SimpleSubexpressionValue,
): SimpleSubexpression => ({
  ...expression,
  firstOperand: value,
});

export const changeSecondOperand = (
  expression: SimpleSubexpression,
  value: SimpleSubexpressionValue,
): SimpleSubexpression => ({
  ...expression,
  secondOperand: value,
});
