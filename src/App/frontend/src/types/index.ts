import type { ExprVal, ExprValToActualOrExpr } from 'src/features/expressions/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RuleFunc<T extends Record<string, any>> = (argObject: T) => T;

export interface IRuleObject {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [id: string]: RuleFunc<any>;
}

export interface ISimpleInstance {
  id: string;
  lastChanged: string;
  lastChangedBy: string;
}

export interface IHiddenLayoutsExternal {
  [layoutKey: string]: ExprValToActualOrExpr<ExprVal.Boolean> | undefined;
}

export interface IExpandedWidthLayouts {
  [layoutKey: string]: boolean | undefined;
}

export enum ProcessTaskType {
  Unknown = 'unknown',
  Service = 'service',
  Data = 'data',
  Archived = 'ended',
  Confirm = 'confirmation',
  Feedback = 'feedback',
  Payment = 'payment',
  Signing = 'signing',
}

export enum PresentationType {
  Stateless = 'stateless',
}

export enum DateFlags {
  Today = 'today',
  Yesterday = 'yesterday',
  Tomorrow = 'tomorrow',
  OneYearAgo = 'oneYearAgo',
  OneYearFromNow = 'oneYearFromNow',
}

export function isProcessTaskType(taskType: string): taskType is ProcessTaskType {
  return Object.values(ProcessTaskType).includes(taskType as ProcessTaskType);
}

export type LooseAutocomplete<T extends string> = T | (string & {}); // NOSONAR
