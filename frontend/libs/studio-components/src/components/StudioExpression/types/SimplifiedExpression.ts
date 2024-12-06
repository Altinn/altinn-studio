import type { SimpleSubexpression } from './SimpleSubexpression';
import type { LogicalTupleOperator } from '../enums/LogicalTupleOperator';

export type SimplifiedExpression<O extends LogicalTupleOperator = LogicalTupleOperator> =
  | boolean
  | SimpleLogicalExpression<O>;

export type SimpleLogicalExpression<O extends LogicalTupleOperator = LogicalTupleOperator> = {
  [K in O]: {
    logicalOperator: K;
    subexpressions: SimpleSubexpression[];
  };
}[O];
