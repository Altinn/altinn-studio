import type { SimpleSubExpression } from './SimpleSubExpression';
import type { LogicalTupleOperator } from '../enums/LogicalTupleOperator';

export type SimplifiedExpression<O extends LogicalTupleOperator = LogicalTupleOperator> =
  | boolean
  | SimpleLogicalExpression<O>;

export type SimpleLogicalExpression<O extends LogicalTupleOperator = LogicalTupleOperator> = {
  [K in O]: {
    logicalOperator: K;
    subExpressions: SimpleSubExpression[];
  };
}[O];
