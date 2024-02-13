import type { SimpleSubExpressionValue } from './SimpleSubExpressionValue';
import type { RelationalOperator } from './RelationalOperator';

export type SimpleSubExpression<O extends RelationalOperator = RelationalOperator> = {
  firstOperand: SimpleSubExpressionValue;
  relationalOperator: O;
  secondOperand: SimpleSubExpressionValue;
};
