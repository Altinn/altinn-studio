import type { NumberRelationOperator } from '../enums/NumberRelationOperator';
import type { GeneralRelationOperator } from '../enums/GeneralRelationOperator';
import type { LogicalTupleOperator } from '../enums/LogicalTupleOperator';
import type { DataLookupFuncName } from '../enums/DataLookupFuncName';
import type { KeyLookupFuncName } from '../enums/KeyLookupFuncName';
import type { InstanceContext } from '../enums/InstanceContext';

export type Expression =
  | null
  | StrictStringExpression
  | StrictBooleanExpression
  | StrictNumberExpression
  | FuncIf;

type FuncIf = FuncIfWithElse | FuncIfWithoutElse;
type FuncIfWithElse = ['if', BooleanExpression, Expression, 'else', Expression];
type FuncIfWithoutElse = ['if', BooleanExpression, Expression];

export type BooleanExpression =
  | null
  | StrictBooleanExpression
  | FuncIf
  | StrictStringExpression
  | StrictNumberExpression;

export type StrictBooleanExpression =
  | boolean
  | FuncEquals
  | FuncEqualsArrayString
  | FuncNotEquals
  | FuncGreaterThan
  | FuncGreaterThanEq
  | FuncLessThan
  | FuncLessThanEq
  | FuncNot
  | FuncAnd
  | FuncOr
  | FuncAuthContext
  | FuncContains
  | FuncNotContains
  | FuncStartsWith
  | FuncEndsWith
  | FuncCommaContains;

export type StringExpression =
  | null
  | StrictStringExpression
  | FuncIf
  | StrictNumberExpression
  | StrictBooleanExpression;

type StrictStringExpression =
  | string
  | FuncComponent
  | FuncDatamodel
  | FuncGatewayAction
  | FuncDisplayValue
  | FuncInstanceContext
  | FuncFrontendSettings
  | FuncConcat
  | FuncFormatDate
  | FuncRound
  | FuncText
  | FuncLanguage
  | FuncLowerCase
  | FuncUpperCase
  | FuncArgv;

export type NumberExpression = null | StrictNumberExpression | FuncIf | StrictStringExpression;

type StrictNumberExpression = number | FuncStringLength;

type GenericDataLookupFunc<N extends DataLookupFuncName> = [N, StringExpression];
export type DataLookupFunc<N extends DataLookupFuncName = DataLookupFuncName> = {
  [K in N]: GenericDataLookupFunc<K>;
}[N];

type GenericKeyLookupFunc<N extends KeyLookupFuncName> = [N, LookupKey<N>];
export type KeyLookupFunc<N extends KeyLookupFuncName = KeyLookupFuncName> = {
  [K in N]: GenericKeyLookupFunc<K>;
}[N];

type GenericNumberRelationFunc<N extends NumberRelationOperator> = [
  N,
  NumberExpression,
  NumberExpression,
];
export type NumberRelationFunc<N extends NumberRelationOperator = NumberRelationOperator> = {
  [K in N]: GenericNumberRelationFunc<K>;
}[N];

type GenericGenericRelationFunc<N extends GeneralRelationOperator> =
  | [N, Expression, Expression]
  | FuncEqualsArrayString;
export type GenericRelationFunc<N extends GeneralRelationOperator = GeneralRelationOperator> = {
  [K in N]: GenericGenericRelationFunc<K>;
}[N];

type GenericLogicalTupleFunc<O extends LogicalTupleOperator> = [
  O,
  BooleanExpression,
  ...BooleanExpression[],
];
export type LogicalTupleFunc<O extends LogicalTupleOperator = LogicalTupleOperator> = {
  [K in O]: GenericLogicalTupleFunc<K>;
}[O];

type FuncComponent = DataLookupFunc<DataLookupFuncName.Component>;
type FuncDatamodel = DataLookupFunc<DataLookupFuncName.DataModel>;
type FuncGatewayAction = DataLookupFunc<DataLookupFuncName.GatewayAction>;
type FuncDisplayValue = ['displayValue', StringExpression];
type FuncInstanceContext = KeyLookupFunc<KeyLookupFuncName.InstanceContext>;
type FuncAuthContext = [
  'authContext',
  'read' | 'write' | 'instantiate' | 'confirm' | 'sign' | 'reject',
];
type FuncFrontendSettings = ['frontendSettings', StringExpression];
type FuncConcat = ['concat', ...StringExpression[]];
type FuncEquals = GenericRelationFunc<GeneralRelationOperator.Equals>;
type FuncEqualsArrayString = [GeneralRelationOperator, [StringExpression], StringExpression];
type FuncNotEquals = GenericRelationFunc<GeneralRelationOperator.NotEquals>;
type FuncNot = ['not', BooleanExpression];
type FuncGreaterThan = NumberRelationFunc<NumberRelationOperator.GreaterThan>;
type FuncGreaterThanEq = NumberRelationFunc<NumberRelationOperator.GreaterThanOrEq>;
type FuncLessThan = NumberRelationFunc<NumberRelationOperator.LessThan>;
type FuncLessThanEq = NumberRelationFunc<NumberRelationOperator.LessThanOrEq>;
type FuncAnd = LogicalTupleFunc<LogicalTupleOperator.And>;
type FuncOr = LogicalTupleFunc<LogicalTupleOperator.Or>;
type FuncFormatDate = ['formatDate', StringExpression, StringExpression];
type FuncRound = ['formatNumber', NumberExpression, NumberExpression];
type FuncText = ['text', StringExpression];
type FuncLanguage = ['language'];
type FuncContains = ['contains', StringExpression, StringExpression];
type FuncNotContains = ['notContains', StringExpression, StringExpression];
type FuncStartsWith = ['startsWith', StringExpression, StringExpression];
type FuncEndsWith = ['endsWith', StringExpression, StringExpression];
type FuncStringLength = ['stringLength', StringExpression];
type FuncCommaContains = ['commaContains', StringExpression, StringExpression];
type FuncLowerCase = ['lowerCase', StringExpression];
type FuncUpperCase = ['upperCase', StringExpression];
type FuncArgv = ['argv', NumberExpression];

type LookupKey<N extends KeyLookupFuncName> = {
  [KeyLookupFuncName.InstanceContext]: InstanceContext;
}[N];
