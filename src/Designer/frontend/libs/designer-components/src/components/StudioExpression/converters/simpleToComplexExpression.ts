import type { SimplifiedExpression, SimpleLogicalExpression } from '../types/SimplifiedExpression';
import type {
  BooleanExpression,
  GenericRelationFunc,
  NumberRelationFunc,
  DataLookupFunc,
  KeyLookupFunc,
  LogicalTupleFunc,
} from '../types/Expression';
import type { RelationalOperator } from '../types/RelationalOperator';
import type { SimpleSubexpression } from '../types/SimpleSubexpression';
import type { SimpleSubexpressionValue } from '../types/SimpleSubexpressionValue';
import type { NumberRelationOperator } from '../enums/NumberRelationOperator';
import type { GeneralRelationOperator } from '../enums/GeneralRelationOperator';
import { DataLookupFuncName } from '../enums/DataLookupFuncName';
import { KeyLookupFuncName } from '../enums/KeyLookupFuncName';
import { SimpleSubexpressionValueType } from '../enums/SimpleSubexpressionValueType';

export const simpleToComplexExpression = (
  simpleExpression: SimplifiedExpression,
): BooleanExpression =>
  typeof simpleExpression === 'boolean'
    ? simpleExpression
    : simpleLogicalExpressionToComplex(simpleExpression);

const simpleLogicalExpressionToComplex = ({
  logicalOperator,
  subexpressions,
}: SimpleLogicalExpression): BooleanExpression => {
  switch (subexpressions.length) {
    case 0:
      return null;
    case 1:
      return subexpressionToComplex(subexpressions[0]);
    default:
      return [logicalOperator, ...subexpressions.map(subexpressionToComplex)] as LogicalTupleFunc;
  }
};

type RelationalOperation<O extends RelationalOperator> = O extends NumberRelationOperator
  ? NumberRelationFunc<O>
  : O extends GeneralRelationOperator
    ? GenericRelationFunc<O>
    : never;

const subexpressionToComplex = <O extends RelationalOperator>({
  relationalOperator,
  firstOperand,
  secondOperand,
}: SimpleSubexpression<O>): RelationalOperation<O> =>
  [
    relationalOperator,
    subexpressionValueToComplex(firstOperand),
    subexpressionValueToComplex(secondOperand),
  ] as RelationalOperation<O>;

const subexpressionValueToComplex = (
  subexpression: SimpleSubexpressionValue,
): DataLookupFunc | KeyLookupFunc | string | number | boolean | null | [string] => {
  switch (subexpression.type) {
    case SimpleSubexpressionValueType.Component:
      return [DataLookupFuncName.Component, subexpression.id];
    case SimpleSubexpressionValueType.DataModel:
      return [DataLookupFuncName.DataModel, subexpression.path];
    case SimpleSubexpressionValueType.InstanceContext:
      return [KeyLookupFuncName.InstanceContext, subexpression.key];
    case SimpleSubexpressionValueType.Null:
      return null;
    case SimpleSubexpressionValueType.CurrentGatewayAction:
      return [KeyLookupFuncName.GatewayAction];
    case SimpleSubexpressionValueType.PredefinedGatewayAction:
      return subexpression.key;
    default:
      return subexpression.value;
  }
};
