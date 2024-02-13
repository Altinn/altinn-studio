import type {
  DataLookupFunc,
  Expression,
  GenericRelationFunc,
  LogicalTupleFunc,
  NumberRelationFunc,
} from '../types/Expression';
import { LogicalTupleOperator } from '../enums/LogicalTupleOperator';
import { DataLookupFuncName } from '../enums/DataLookupFuncName';
import { componentIds, datamodelPointers } from './dataLookupOptions';
import { GenericRelationOperator } from '../enums/GenericRelationOperator';
import { NumberRelationOperator } from '../enums/NumberRelationOperator';

const datamodelValue: DataLookupFunc<DataLookupFuncName.DataModel> = [
  DataLookupFuncName.DataModel,
  datamodelPointers[0],
];

const componentValue: DataLookupFunc<DataLookupFuncName.Component> = [
  DataLookupFuncName.Component,
  componentIds[0],
];

const stringValue: string = 'some-text';
const numberValue: number = 5;

export const genericOperatorRelation: GenericRelationFunc = [
  GenericRelationOperator.Equals,
  datamodelValue,
  stringValue,
];

export const numberOperatorRelation: NumberRelationFunc = [
  NumberRelationOperator.GreaterThan,
  componentValue,
  numberValue,
];

export const logicalExpression: LogicalTupleFunc = [
  LogicalTupleOperator.And,
  genericOperatorRelation,
  numberOperatorRelation,
];

export const tooComplexExpression: Expression = [
  LogicalTupleOperator.Or,
  [LogicalTupleOperator.And, genericOperatorRelation, numberOperatorRelation],
  genericOperatorRelation,
];
