export enum ExprVal {
  Boolean = '__boolean__',
  String = '__string__',
  Number = '__number__',
  Date = '__date__',
  List = '__list__',
  Object = '__object__',
  Any = '__any__',
}

export interface ExprDateExtensions {
  timeZone: 'local' | 'utc' | string;
  raw: string;
}

export type ExprDate = Date & { exprDateExtensions: ExprDateExtensions };
export type ValidValue = string | number | boolean | null | ValidArray | ValidObject;
export type ValidArray = Array<ValidValue>;
export type ValidObject = { [key: string]: ValidValue };

export type ExprValToActual<T extends ExprVal = ExprVal> = T extends ExprVal.Date
  ? ExprDate
  : T extends ExprVal.String
    ? string
    : T extends ExprVal.Number
      ? number
      : T extends ExprVal.Boolean
        ? boolean
        : T extends ExprVal.List
          ? ValidArray
          : T extends ExprVal.Object
            ? ValidObject
            : T extends ExprVal.Any
              ? ValidValue
              : unknown;

/**
 * Layout contracts only need the stable serialized expression shape. The App runtime applies
 * its stricter function-name and argument validation when evaluating an expression.
 */
export type LayoutExpression<T extends ExprVal = ExprVal> = [
  functionName: ExpressionFunctionNameByReturn[T] | ExpressionFunctionNameByReturn[ExprVal.Any],
  ...arguments_: unknown[],
];
export type ExprValToActualOrExpr<T extends ExprVal> = ExprValToActual<T> | LayoutExpression<T>;
import type { ExpressionFunctionNameByReturn } from './generated/expression-functions.generated';
