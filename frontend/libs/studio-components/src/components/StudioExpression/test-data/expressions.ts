import type {
  DataLookupFunc,
  Expression,
  GenericRelationFunc,
  LogicalTupleFunc,
  NumberRelationFunc,
} from '../types/Expression';
import { LogicalTupleOperator } from '../enums/LogicalTupleOperator';
import { DataLookupFuncName } from '../enums/DataLookupFuncName';
import { componentIds, dataModelPointers } from './dataLookupOptions';
import { GeneralRelationOperator } from '../enums/GeneralRelationOperator';
import { NumberRelationOperator } from '../enums/NumberRelationOperator';

const dataModelValue: DataLookupFunc<DataLookupFuncName.DataModel> = [
  DataLookupFuncName.DataModel,
  dataModelPointers[0],
];

const componentValue: DataLookupFunc<DataLookupFuncName.Component> = [
  DataLookupFuncName.Component,
  componentIds[0],
];

const stringValue: string = 'some-text';
const numberValue: number = 5;

export const generalOperatorRelation: GenericRelationFunc = [
  GeneralRelationOperator.Equals,
  dataModelValue,
  stringValue,
];

export const numberOperatorRelation: NumberRelationFunc = [
  NumberRelationOperator.GreaterThan,
  componentValue,
  numberValue,
];

export const logicalExpression: LogicalTupleFunc = [
  LogicalTupleOperator.And,
  generalOperatorRelation,
  numberOperatorRelation,
];

export const tooComplexExpression: Expression = [
  LogicalTupleOperator.Or,
  [LogicalTupleOperator.And, generalOperatorRelation, numberOperatorRelation],
  generalOperatorRelation,
];
