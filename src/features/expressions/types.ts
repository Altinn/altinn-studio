import type { PickByValue } from 'utility-types';

import type { ExprFunctions } from 'src/features/expressions';
import type { ExprContext } from 'src/features/expressions/ExprContext';
import type { ValidationContext } from 'src/features/expressions/validation';

type Functions = typeof ExprFunctions;

/**
 * This union type includes all possible functions usable in expressions
 */
export type ExprFunction = keyof Functions;

export enum ExprVal {
  Boolean = '__boolean__',
  String = '__string__',
  Number = '__number__',
  Any = '__any__',
}

export type ExprValToActual<T extends ExprVal = ExprVal> = T extends ExprVal.String
  ? string
  : T extends ExprVal.Number
    ? number
    : T extends ExprVal.Boolean
      ? boolean
      : T extends ExprVal.Any
        ? string | number | boolean | null
        : unknown;

export type ActualToExprVal<T> = T extends string
  ? ExprVal.String
  : T extends number
    ? ExprVal.Number
    : T extends boolean
      ? ExprVal.Boolean
      : T extends null
        ? ExprVal.Any
        : never;

/**
 * This type replaces ExprVal with the actual value type, or expression that returns that type.
 */
export type ExprValToActualOrExpr<T extends ExprVal> =
  | ExprValToActual<T>
  | NonRecursiveExpression<FunctionsReturning<T>>;

type ArgsToActualOrNull<T extends readonly ExprVal[]> = {
  [Index in keyof T]: ExprValToActual<T[Index]> | null;
};

export interface FuncDef<Args extends readonly ExprVal[], Ret extends ExprVal> {
  impl: (this: ExprContext, ...params: ArgsToActualOrNull<Args>) => ExprValToActual<Ret> | null;
  args: Args;
  minArguments?: number;
  returns: Ret;

  // Optional: Set this to true if the last argument type is considered a '...spread' argument, meaning
  // all the rest of the arguments should be cast to the last type (and that the function allows any
  // amount  of parameters).
  lastArgSpreads?: true;

  // Optional: Validator function which runs when the function is validated. This allows a function to add its own
  // validation requirements. Use the addError() function if any errors are found.
  validator?: (options: {
    rawArgs: any[];
    argTypes: (ExprVal | undefined)[];
    ctx: ValidationContext;
    path: string[];
  }) => void;
}

type ArgsFor<F extends ExprFunction> = F extends ExprFunction ? Functions[F]['args'] : never;

type FunctionsReturning<T extends ExprVal> =
  | keyof PickByValue<Functions, { returns: T }>
  | keyof PickByValue<Functions, { returns: ExprVal.Any }>;

/**
 * An expression definition is basically [functionName, ...arguments], but when we map arguments (using their
 * index from zero) in MaybeRecursive (to support recursive expressions) we'll need to place the function name first.
 * Because of a TypeScript limitation we can't do this the easy way, so this hack makes sure to place our argument
 * base value types from index 1 and onwards.
 *
 * @see https://github.com/microsoft/TypeScript/issues/29919
 */
type IndexHack<F extends ExprFunction> = ['Here goes the function name', ...ArgsFor<F>];

type MaybeRecursive<
  F extends ExprFunction,
  Iterations extends Prev[number],
  Args extends ('Here goes the function name' | ExprVal)[] = IndexHack<F>,
> = [Iterations] extends [never]
  ? never
  : {
      [Index in keyof Args]: Args[Index] extends ExprVal
        ? ExprValToActual<Args[Index]> | MaybeRecursive<FunctionsReturning<Args[Index]>, Prev[Iterations]>
        : F;
    };

/**
 * The base type that represents any valid expression function call. When used as a type
 * inside a layout definition, you probably want something like ExpressionOr<'boolean'>
 */
export type Expression<F extends ExprFunction = ExprFunction> = MaybeRecursive<F, 2>;

/**
 * A much simpler variant of the type above, as it only type-checks the very outer function name
 */
export type NonRecursiveExpression<F extends ExprFunction = ExprFunction> = [F, ...any];

/**
 * This type removes all expressions from the input type (replacing them with the type
 * the expression is expected to return)
 *
 * @see https://www.typescriptlang.org/docs/handbook/2/conditional-types.html#distributive-conditional-types
 * @see https://stackoverflow.com/a/54487392
 */
export type ExprResolved<T> = T extends [FunctionsReturning<any>, ...any]
  ? never
  : T extends any
    ? T extends object
      ? {
          [P in keyof T]: ExprResolved<T[P]>;
        }
      : T
    : T;

/**
 * This type can be self-references in order to limit recursion depth for advanced types
 * @see https://stackoverflow.com/a/70552078
 */
type Prev = [never, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

/**
 * Expression configuration. This configuration object indicates to the expression engine what we expect of the
 * expression, such as the return type and the default value (which will be used should the expression fail at
 * some point)
 */
export interface ExprConfig<V extends ExprVal = ExprVal> {
  returnType: V;
  defaultValue: ExprValToActual<V> | null;
}

export type ExprPositionalArgs = ExprValToActual<ExprVal.Any>[];
