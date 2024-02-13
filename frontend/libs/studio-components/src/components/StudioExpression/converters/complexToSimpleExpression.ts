import type {
  DataLookupFunc,
  Expression,
  KeyLookupFunc,
  LogicalTupleFunc,
} from '../types/Expression';
import type { SimplifiedExpression } from '../types/SimplifiedExpression';
import {
  isExpressionSimple,
  isRelationFunc,
  isSimpleDataLookupFunc,
  isSimpleKeyLookupFunc,
  isSimpleLogicalTupleFunc,
  isSimpleValueFunc,
} from '../validators/isExpressionSimple';
import { DEFAULT_LOGICAL_OPERATOR } from '../config';
import type { SimpleSubExpressionValue } from '../types/SimpleSubExpressionValue';
import type { SimpleSubExpression } from '../types/SimpleSubExpression';
import type { ValueInComplexFormat } from '../types/ValueInComplexFormat';
import type { RelationFunc } from '../types/RelationFunc';
import { DataLookupFuncName } from '../enums/DataLookupFuncName';
import { SimpleSubExpressionValueType } from '../enums/SimpleSubExpressionValueType';

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
  subExpressions: [],
};

const complexRelationFuncToSimpleExpression = (func: RelationFunc): SimplifiedExpression => ({
  logicalOperator: DEFAULT_LOGICAL_OPERATOR,
  subExpressions: [complexRelationFuncToSimpleSubExpression(func)],
});

const complexRelationFuncToSimpleSubExpression = ([
  relationalOperator,
  firstValue,
  secondValue,
]: RelationFunc): SimpleSubExpression => {
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

const complexValueToSimple = (value: ValueInComplexFormat): SimpleSubExpressionValue => {
  if (isSimpleDataLookupFunc(value)) return dataLookupFuncToSimpleFormat(value);
  if (isSimpleKeyLookupFunc(value)) return keyLookupFuncToSimpleFormat(value);
  return primitiveValueToSimpleFormat(value);
};

const dataLookupFuncToSimpleFormat = ([source, key]: DataLookupFunc): SimpleSubExpressionValue => {
  if (typeof key !== 'string')
    throw new Error(
      'Data lookup function is not convertable. This should have been picked up by the validator.',
    );
  switch (source) {
    case DataLookupFuncName.Component:
      return { type: SimpleSubExpressionValueType.Component, id: key };
    case DataLookupFuncName.DataModel:
      return { type: SimpleSubExpressionValueType.Datamodel, path: key };
  }
};

const keyLookupFuncToSimpleFormat = ([, key]: KeyLookupFunc): SimpleSubExpressionValue => {
  if (typeof key !== 'string')
    throw new Error(
      'Key lookup function is not convertable. This should have been picked up by the validator.',
    );
  return { type: SimpleSubExpressionValueType.InstanceContext, key };
};

const primitiveValueToSimpleFormat = (
  value: string | number | boolean | null,
): SimpleSubExpressionValue => {
  switch (typeof value) {
    case 'string':
      return { type: SimpleSubExpressionValueType.String, value };
    case 'number':
      return { type: SimpleSubExpressionValueType.Number, value };
    case 'boolean':
      return { type: SimpleSubExpressionValueType.Boolean, value };
    default:
      return { type: SimpleSubExpressionValueType.Null };
  }
};

const logicalTupleFuncToSimpleFormat = ([
  logicalOperator,
  ...values
]: LogicalTupleFunc): SimplifiedExpression => ({
  logicalOperator,
  subExpressions: values.map(complexRelationFuncToSimpleSubExpression),
});
