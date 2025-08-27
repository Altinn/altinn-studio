import type { LogicalTupleFunc } from 'libs/studio-components-legacy/src';
import { GeneralRelationOperator, LogicalTupleOperator } from 'libs/studio-components-legacy/src';

const stringValue = 'some-string-value';
const numberValue = 1024;
const nullValue = null;
const booleanValue = true;

export const parsableLogicalExpression: LogicalTupleFunc = [
  LogicalTupleOperator.And,
  [GeneralRelationOperator.Equals, stringValue, nullValue],
  [GeneralRelationOperator.Equals, numberValue, booleanValue],
];
