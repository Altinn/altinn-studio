import type {
  GenericRelationFunc,
  NumberRelationFunc,
  DataLookupFunc,
  Expression,
  KeyLookupFunc,
  LogicalTupleFunc,
} from '../types/Expression';
import type { ValueInComplexFormat } from '../types/ValueInComplexFormat';
import type { RelationFunc } from '../types/RelationFunc';
import { NumberRelationOperator } from '../enums/NumberRelationOperator';
import { GeneralRelationOperator } from '../enums/GeneralRelationOperator';
import { DataLookupFuncName } from '../enums/DataLookupFuncName';
import { KeyLookupFuncName } from '../enums/KeyLookupFuncName';
import { LogicalTupleOperator } from '../enums/LogicalTupleOperator';
import { GatewayActionContext } from '../enums/GatewayActionContext';

/** Returns true if the expression can be converted to a SimpleExpression object */
export const isExpressionSimple = (
  expression: Expression,
): expression is boolean | null | RelationFunc | ValueInComplexFormat =>
  typeof expression === 'boolean' ||
  expression === null ||
  isRelationFunc(expression) ||
  isSimpleLogicalTupleFunc(expression);

export const isRelationFunc = (expression: Expression): expression is RelationFunc =>
  isNumberRelationFunc(expression) || isTypeIndependentRelationFunc(expression);

const isNumberRelationFunc = (expression: Expression): expression is NumberRelationFunc =>
  Array.isArray(expression) &&
  expression.length === 3 &&
  Object.values(NumberRelationOperator).includes(expression[0] as NumberRelationOperator) &&
  isSimpleValueFunc(expression[1] as Expression) &&
  isSimpleValueFunc(expression[2]);

const isTypeIndependentRelationFunc = (expression: Expression): expression is GenericRelationFunc =>
  Array.isArray(expression) &&
  expression.length === 3 &&
  Object.values(GeneralRelationOperator).includes(expression[0] as GeneralRelationOperator) &&
  isSimpleValueFunc(expression[1] as Expression) &&
  isSimpleValueFunc(expression[2]);

export const isSimpleValueFunc = (expression: Expression): expression is ValueInComplexFormat =>
  expression === null ||
  typeof expression === 'number' ||
  typeof expression === 'string' ||
  typeof expression === 'boolean' ||
  isSimpleDataLookupFunc(expression) ||
  isSimpleKeyLookupFunc(expression) ||
  isProcessDataLookupFunc(expression);

export const isSimpleDataLookupFunc = (expression: Expression): expression is DataLookupFunc =>
  Array.isArray(expression) &&
  expression.length === 2 &&
  Object.values(DataLookupFuncName).includes(expression[0] as DataLookupFuncName) &&
  typeof expression[1] === 'string';

export const isProcessDataLookupFunc = (expression: Expression): expression is DataLookupFunc => {
  return (
    Array.isArray(expression) &&
    [DataLookupFuncName.GatewayAction].includes(expression[0] as DataLookupFuncName)
  );
};

export const isProcessUserAction = (expression: Expression): expression is GatewayActionContext => {
  const actions = Object.values(GatewayActionContext);
  return typeof expression === 'string' && actions.includes(expression as GatewayActionContext);
};

export const isProcessGatewayAction = (expression: Expression): expression is DataLookupFunc => {
  return Array.isArray(expression) && expression[0] === DataLookupFuncName.GatewayAction;
};

export const isSimpleKeyLookupFunc = (expression: Expression): expression is KeyLookupFunc =>
  Array.isArray(expression) &&
  expression.length === 2 &&
  Object.values(KeyLookupFuncName).includes(expression[0] as KeyLookupFuncName) &&
  typeof expression[1] === 'string';

export const isSimpleLogicalTupleFunc = (expression: Expression): expression is LogicalTupleFunc =>
  Array.isArray(expression) &&
  expression.length > 2 &&
  Object.values(LogicalTupleOperator).includes(expression[0] as LogicalTupleOperator) &&
  expression.slice(1).every(isRelationFunc);
