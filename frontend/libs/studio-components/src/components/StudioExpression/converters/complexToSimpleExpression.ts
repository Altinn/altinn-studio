import type {
  DataLookupFunc,
  Expression,
  KeyLookupFunc,
  LogicalTupleFunc,
} from '../types/Expression';
import type { SimplifiedExpression } from '../types/SimplifiedExpression';
import {
  isExpressionSimple,
  isProcessGatewayAction,
  isRelationFunc,
  isSimpleDataLookupFunc,
  isSimpleKeyLookupFunc,
  isSimpleLogicalTupleFunc,
  isProcessUserAction,
  isSimpleValueFunc,
} from '../validators/isExpressionSimple';
import { DEFAULT_LOGICAL_OPERATOR } from '../config';
import type { SimpleSubexpressionValue } from '../types/SimpleSubexpressionValue';
import type { SimpleSubexpression } from '../types/SimpleSubexpression';
import type { ValueInComplexFormat } from '../types/ValueInComplexFormat';
import type { RelationFunc } from '../types/RelationFunc';
import { DataLookupFuncName } from '../enums/DataLookupFuncName';
import { SimpleSubexpressionValueType } from '../enums/SimpleSubexpressionValueType';
import { type GatewayActionContext } from '../enums/GatewayActionContext';
import { type InstanceContext } from '../enums/InstanceContext';

export const complexToSimpleExpression = (expression: Expression): SimplifiedExpression => {
  if (!isExpressionSimple(expression)) throw new Error('Expression is not simple.');
  if (typeof expression === 'boolean') return expression;
  if (expression === null) return nullExpressionInSimpleFormat;
  if (isRelationFunc(expression)) return complexRelationFuncToSimpleExpression(expression);
  if (isSimpleLogicalTupleFunc(expression)) return logicalTupleFuncToSimpleFormat(expression);
  throw new Error(
    'Expression is not convertable. This should have been picked up by the validator.',
  );
};

const nullExpressionInSimpleFormat: SimplifiedExpression = {
  logicalOperator: DEFAULT_LOGICAL_OPERATOR,
  subexpressions: [],
};

const complexRelationFuncToSimpleExpression = (func: RelationFunc): SimplifiedExpression => ({
  logicalOperator: DEFAULT_LOGICAL_OPERATOR,
  subexpressions: [complexRelationFuncToSimpleSubexpression(func)],
});

const complexRelationFuncToSimpleSubexpression = ([
  relationalOperator,
  firstValue,
  secondValue,
]: RelationFunc): SimpleSubexpression => {
  if (!isSimpleValueFunc(firstValue) || !isSimpleValueFunc(secondValue))
    throw new Error(
      'Relation function is not convertable. This should have been picked up by the validator.',
    );

  return {
    relationalOperator,
    firstOperand: complexValueToSimple(firstValue),
    secondOperand: complexValueToSimple(secondValue),
  };
};

const complexValueToSimple = (value: ValueInComplexFormat): SimpleSubexpressionValue => {
  if (isSimpleDataLookupFunc(value)) return dataLookupFuncToSimpleFormat(value);
  if (isSimpleKeyLookupFunc(value)) return keyLookupFuncToSimpleFormat(value);
  if (isProcessGatewayAction(value)) return processActionToSimpleFormat(value);
  if (isProcessUserAction(value)) return processUserActionToSimpleFormat(value);
  return primitiveValueToSimpleFormat(value);
};
const dataLookupFuncToSimpleFormat = ([source, key]: DataLookupFunc): SimpleSubexpressionValue => {
  if (typeof key !== 'string')
    throw new Error(
      'Data lookup function is not convertable. This should have been picked up by the validator.',
    );

  switch (source) {
    case DataLookupFuncName.Component:
      return { type: SimpleSubexpressionValueType.Component, id: key };
    case DataLookupFuncName.DataModel:
      return { type: SimpleSubexpressionValueType.DataModel, path: key };
  }
};

const processActionToSimpleFormat = ([value]: DataLookupFunc): SimpleSubexpressionValue => {
  if (Array.isArray(value) && value[0] !== SimpleSubexpressionValueType.GatewayActionContext) {
    throw new Error(
      'Data lookup function is not convertable. This should have been picked up by the validator.',
    );
  }

  return {
    type: SimpleSubexpressionValueType.GatewayAction,
    value: 'GatewayAction',
  };
};

const processUserActionToSimpleFormat = (
  action: GatewayActionContext,
): SimpleSubexpressionValue => {
  return {
    type: SimpleSubexpressionValueType.GatewayActionContext,
    key: action as GatewayActionContext,
  };
};

const keyLookupFuncToSimpleFormat = ([, key]: KeyLookupFunc): SimpleSubexpressionValue => {
  if (typeof key !== 'string')
    throw new Error(
      'Key lookup function is not convertable. This should have been picked up by the validator.',
    );
  return { type: SimpleSubexpressionValueType.InstanceContext, key: key as InstanceContext };
};

const primitiveValueToSimpleFormat = (
  value: string | number | boolean | null,
): SimpleSubexpressionValue => {
  switch (typeof value) {
    case 'string':
      return { type: SimpleSubexpressionValueType.String, value };
    case 'number':
      return { type: SimpleSubexpressionValueType.Number, value };
    case 'boolean':
      return { type: SimpleSubexpressionValueType.Boolean, value };
    default:
      return { type: SimpleSubexpressionValueType.Null };
  }
};

const logicalTupleFuncToSimpleFormat = ([
  logicalOperator,
  ...values
]: LogicalTupleFunc): SimplifiedExpression => ({
  logicalOperator,
  subexpressions: values.map(complexRelationFuncToSimpleSubexpression),
});
