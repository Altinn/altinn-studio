import type { LogicalTupleFunc } from '@designer/components';
import { GeneralRelationOperator, LogicalTupleOperator } from '@designer/components';

const stringValue = 'some-string-value';
const numberValue = 1024;
const nullValue = null;
const booleanValue = true;

export const parsableLogicalExpression: LogicalTupleFunc = [
  LogicalTupleOperator.And,
  [GeneralRelationOperator.Equals, stringValue, nullValue],
  [GeneralRelationOperator.Equals, numberValue, booleanValue],
];
