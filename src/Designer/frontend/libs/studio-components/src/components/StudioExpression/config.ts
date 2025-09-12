import { LogicalTupleOperator } from './enums/LogicalTupleOperator';
import type { SimpleSubexpression } from './types/SimpleSubexpression';
import { SimpleSubexpressionValueType } from './enums/SimpleSubexpressionValueType';
import { GeneralRelationOperator } from './enums/GeneralRelationOperator';
import type { SimpleLogicalExpression } from './types/SimplifiedExpression';

export const DEFAULT_LOGICAL_OPERATOR = LogicalTupleOperator.And;

export const DEFAULT_SUBEXPRESSION: SimpleSubexpression = {
  firstOperand: { type: SimpleSubexpressionValueType.Number, value: 0 },
  secondOperand: { type: SimpleSubexpressionValueType.Number, value: 0 },
  relationalOperator: GeneralRelationOperator.Equals,
};

export const DEFAULT_LOGICAL_EXPRESSION: SimpleLogicalExpression = {
  logicalOperator: DEFAULT_LOGICAL_OPERATOR,
  subexpressions: [DEFAULT_SUBEXPRESSION],
};
