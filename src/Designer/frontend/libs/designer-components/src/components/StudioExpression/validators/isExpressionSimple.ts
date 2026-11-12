import type {
  GenericRelationFunc,
  NumberRelationFunc,
  DataLookupFunc,
  Expression,
  KeyLookupFunc,
  LogicalTupleFunc,
  FuncInstanceContext,
  FuncGatewayAction,
} from '../types/Expression';
import type { ValueInComplexFormat } from '../types/ValueInComplexFormat';
import type { RelationFunc } from '../types/RelationFunc';
import { NumberRelationOperator } from '../enums/NumberRelationOperator';
import { GeneralRelationOperator } from '../enums/GeneralRelationOperator';
import { DataLookupFuncName } from '../enums/DataLookupFuncName';
import { KeyLookupFuncName } from '../enums/KeyLookupFuncName';
import { LogicalTupleOperator } from '../enums/LogicalTupleOperator';
import { InstanceContext } from '../enums/InstanceContext';

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
  isSimpleValueFunc(expression[1]) &&
  isSimpleValueFunc(expression[2]);

const isTypeIndependentRelationFunc = (expression: Expression): expression is GenericRelationFunc =>
  Array.isArray(expression) &&
  expression.length === 3 &&
  Object.values(GeneralRelationOperator).includes(expression[0] as GeneralRelationOperator) &&
  isSimpleValueFunc(expression[1]) &&
  isSimpleValueFunc(expression[2]);

export const isSimpleValueFunc = (expression: Expression): expression is ValueInComplexFormat =>
  expression === null ||
  typeof expression === 'number' ||
  typeof expression === 'string' ||
  typeof expression === 'boolean' ||
  isSimpleDataLookupFunc(expression) ||
  isSimpleKeyLookupFunc(expression);

export const isSimpleDataLookupFunc = (expression: Expression): expression is DataLookupFunc =>
  Array.isArray(expression) &&
  expression.length === 2 &&
  Object.values(DataLookupFuncName).includes(expression[0] as DataLookupFuncName) &&
  typeof expression[1] === 'string';

export const isSimpleKeyLookupFunc = (expression: Expression): expression is KeyLookupFunc =>
  isInstanceContextFunc(expression) || isGatewayActionFunc(expression);

const isInstanceContextFunc = (expression: Expression): expression is FuncInstanceContext =>
  Array.isArray(expression) &&
  expression.length === 2 &&
  expression[0] === KeyLookupFuncName.InstanceContext &&
  Object.values(InstanceContext).includes(expression[1]);

const isGatewayActionFunc = (expression: Expression): expression is FuncGatewayAction =>
  Array.isArray(expression) &&
  expression.length === 1 &&
  expression[0] === KeyLookupFuncName.GatewayAction;

export const isSimpleLogicalTupleFunc = (expression: Expression): expression is LogicalTupleFunc =>
  Array.isArray(expression) &&
  expression.length > 2 &&
  Object.values(LogicalTupleOperator).includes(expression[0] as LogicalTupleOperator) &&
  expression.slice(1).every(isRelationFunc);
