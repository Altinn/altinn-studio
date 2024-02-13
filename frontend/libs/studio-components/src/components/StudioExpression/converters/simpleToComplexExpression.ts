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
import type { SimpleSubExpression } from '../types/SimpleSubExpression';
import type { SimpleSubExpressionValue } from '../types/SimpleSubExpressionValue';
import type { NumberRelationOperator } from '../enums/NumberRelationOperator';
import type { GenericRelationOperator } from '../enums/GenericRelationOperator';
import { DataLookupFuncName } from '../enums/DataLookupFuncName';
import { KeyLookupFuncName } from '../enums/KeyLookupFuncName';
import { SimpleSubExpressionValueType } from '../enums/SimpleSubExpressionValueType';

export const simpleToComplexExpression = (
  simpleExpression: SimplifiedExpression,
): BooleanExpression =>
  typeof simpleExpression === 'boolean'
    ? simpleExpression
    : simpleLogicalExpressionToComplex(simpleExpression);

const simpleLogicalExpressionToComplex = ({
  logicalOperator,
  subExpressions,
}: SimpleLogicalExpression): BooleanExpression => {
  switch (subExpressions.length) {
    case 0:
      return null;
    case 1:
      return subExpressionToComplex(subExpressions[0]);
    default:
      return [logicalOperator, ...subExpressions.map(subExpressionToComplex)] as LogicalTupleFunc;
  }
};

type RelationalOperation<O extends RelationalOperator> = O extends NumberRelationOperator
  ? NumberRelationFunc<O>
  : O extends GenericRelationOperator
    ? GenericRelationFunc<O>
    : never;

const subExpressionToComplex = <O extends RelationalOperator>({
  relationalOperator,
  firstOperand,
  secondOperand,
}: SimpleSubExpression<O>): RelationalOperation<O> =>
  [
    relationalOperator,
    subExpressionValueToComplex(firstOperand),
    subExpressionValueToComplex(secondOperand),
  ] as RelationalOperation<O>;

const subExpressionValueToComplex = (
  subExpression: SimpleSubExpressionValue,
): DataLookupFunc | KeyLookupFunc | string | number | boolean | null => {
  switch (subExpression.type) {
    case SimpleSubExpressionValueType.Component:
      return [DataLookupFuncName.Component, subExpression.id];
    case SimpleSubExpressionValueType.Datamodel:
      return [DataLookupFuncName.DataModel, subExpression.path];
    case SimpleSubExpressionValueType.InstanceContext:
      return [KeyLookupFuncName.InstanceContext, subExpression.key];
    case SimpleSubExpressionValueType.Null:
      return null;
    default:
      return subExpression.value;
  }
};
