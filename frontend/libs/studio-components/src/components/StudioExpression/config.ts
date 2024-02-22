import { LogicalTupleOperator } from './enums/LogicalTupleOperator';
import type { SimpleSubExpression } from './types/SimpleSubExpression';
import { SimpleSubExpressionValueType } from './enums/SimpleSubExpressionValueType';
import { GeneralRelationOperator } from './enums/GeneralRelationOperator';
import type { SimpleLogicalExpression } from './types/SimplifiedExpression';

export const DEFAULT_LOGICAL_OPERATOR = LogicalTupleOperator.And;

export const DEFAULT_SUBEXPRESSION: SimpleSubExpression = {
  firstOperand: { type: SimpleSubExpressionValueType.Number, value: 0 },
  secondOperand: { type: SimpleSubExpressionValueType.Number, value: 0 },
  relationalOperator: GeneralRelationOperator.Equals,
};

export const DEFAULT_LOGICAL_EXPRESSION: SimpleLogicalExpression = {
  logicalOperator: DEFAULT_LOGICAL_OPERATOR,
  subExpressions: [DEFAULT_SUBEXPRESSION],
};
