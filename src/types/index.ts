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

export interface IExpandedWidthLayoutsExternal {
  [layoutKey: string]: boolean;
}

export enum ProcessTaskType {
  Unknown = 'unknown',
  Data = 'data',
  Archived = 'ended',
  Confirm = 'confirmation',
  Feedback = 'feedback',
  Payment = 'payment',
}

export enum PresentationType {
  Stateless = 'stateless',
}

export enum DateFlags {
  Today = 'today',
}

export function isProcessTaskType(taskType: string): taskType is ProcessTaskType {
  return Object.values(ProcessTaskType).includes(taskType as ProcessTaskType);
}

/**
 * This function can be used to have TypeScript enforce that we never reach the code branch in question
 * @see https://stackoverflow.com/a/39419171
 */
export function assertUnreachable<Ret = never>(_x: never, execute?: () => Ret): Ret {
  if (execute) {
    return execute();
  }
  throw new Error('Reached unreachable code');
}
