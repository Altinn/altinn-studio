import type { SimpleSubexpressionValue } from './SimpleSubexpressionValue';
import type { RelationalOperator } from './RelationalOperator';

export type SimpleSubexpression<O extends RelationalOperator = RelationalOperator> = {
  firstOperand: SimpleSubexpressionValue;
  relationalOperator: O;
  secondOperand: SimpleSubexpressionValue;
};
