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
 * @deprecated Use internal types for components instead
 * @see https://www.typescriptlang.org/docs/handbook/2/conditional-types.html#distributive-conditional-types
 * @see https://stackoverflow.com/a/54487392
 */
export type ExprResolved<T> = T extends ExprVal
  ? ExprValToActual<T>
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
 * Removes all properties from an object where its keys point to never types. This turns { defunctProp: never } into {}
 */
type OmitNeverKeys<T> = {
  [P in keyof T as T[P] extends never ? never : P]: T[P];
};

type OmitEmptyObjects<T> = T extends Record<string, never> ? never : T;

type OmitNeverArrays<T> = T extends never[] ? never : T;

/**
 * Expression configuration. This configuration object needs to be set on every layout property which can be resolved
 * as an expression, and it is the configuration passed to the expression evaluator.
 */
export interface ExprConfig<V extends ExprVal = ExprVal> {
  returnType: V;
  defaultValue: ExprValToActual<V> | null;
  errorAsException?: true;

  // Setting this to true means that if there are such expressions on a repeating 'Group' layout component, they will
  // be evaluated separately for each row in the group. This means you can have a property like edit.deleteButton which
  // hides the delete button, and this behaviour may differ for each row.
  resolvePerRow: boolean;
}

/**
 * This is the heavy lifter used by ExprObjConfig to recursively iterate types
 */
type DistributiveExprConfig<T, Iterations extends Prev[number]> = [T] extends [
  string | number | boolean | null | undefined,
]
  ? never
  : T extends ExprVal
  ? ExprConfig<T>
  : [T] extends [object]
  ? OmitEmptyObjects<ExprObjConfig<T, Prev[Iterations]>>
  : never;

/**
 * This type looks through an object recursively, finds any expressions, and requires you to provide a default
 * value for them (i.e. a fallback value should the expression evaluation fail).
 */
export type ExprObjConfig<
  T,
  Iterations extends Prev[number] = 1, // <-- Recursion depth limited to 2 levels by default
> = [Iterations] extends [never]
  ? never
  : OmitNeverKeys<{
      [P in keyof Required<T>]: OmitNeverArrays<DistributiveExprConfig<Exclude<T[P], undefined>, Iterations>>;
    }>;

export type ExprPositionalArgs = ExprValToActual<ExprVal.Any>[];
