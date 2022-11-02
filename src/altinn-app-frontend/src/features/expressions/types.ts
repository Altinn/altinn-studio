import type { PickByValue } from 'utility-types';

import type { ExprFunctions } from 'src/features/expressions';
import type { ExprContext } from 'src/features/expressions/ExprContext';
import type { ValidationContext } from 'src/features/expressions/validation';

type Functions = typeof ExprFunctions;

/**
 * This union type includes all possible functions usable in expressions
 */
export type ExprFunction = keyof Functions;

export type BaseValue = 'string' | 'number' | 'boolean';
export type BaseToActual<T extends BaseValue> = T extends 'string'
  ? string
  : T extends 'number'
  ? number
  : T extends 'boolean'
  ? boolean
  : never;

/**
 * A version of the type above that avoids spreading union types. Meaning, it only accepts concrete types from inside
 * BaseValue, not the union type BaseValue itself:
 *    type Test1 = BaseToActual<BaseValue>; // string | number | boolean
 *    type Test2 = BaseToActualStrict<BaseValue>; // never
 *
 * @see https://www.typescriptlang.org/docs/handbook/2/conditional-types.html#distributive-conditional-types
 */
export type BaseToActualStrict<T extends BaseValue> = [T] extends ['string']
  ? string
  : [T] extends ['number']
  ? number
  : [T] extends ['boolean']
  ? boolean
  : never;

type ArgsToActual<T extends readonly BaseValue[]> = {
  [Index in keyof T]: BaseToActual<T[Index]>;
};

export interface FuncDef<
  Args extends readonly BaseValue[],
  Ret extends BaseValue,
> {
  impl: (
    this: ExprContext,
    ...params: ArgsToActual<Args>
  ) => BaseToActual<Ret> | null;
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
    argTypes: (BaseValue | undefined)[];
    ctx: ValidationContext;
    path: string[];
  }) => void;

  // Optional: Allows a function to specify that certain arguments (at the given indexes) should never be cast on the
  // way in.
  neverCastArguments?: number[];

  // Optional: Cast return value to the one specified in the 'returns' property. Setting to false allows for functions
  // passing through their arguments without knowing (or caring) about their specific types. Defaults to true.
  castReturnValue?: boolean;
}

type BaseValueArgsFor<F extends ExprFunction> = F extends ExprFunction
  ? Functions[F]['args']
  : never;

type FunctionsReturning<T extends BaseValue> = keyof PickByValue<
  Functions,
  { returns: T }
>;

export type ExprReturning<T extends BaseValue> = Expression<
  FunctionsReturning<T>
>;

/**
 * An expression definition is basically [functionName, ...arguments], but when we map arguments (using their
 * index from zero) in MaybeRecursive (to support recursive expressions) we'll need to place the function name first.
 * Because of a TypeScript limitation we can't do this the easy way, so this hack makes sure to place our argument
 * base value types from index 1 and onwards.
 *
 * @see https://github.com/microsoft/TypeScript/issues/29919
 */
type IndexHack<F extends ExprFunction> = [
  'Here goes the function name',
  ...BaseValueArgsFor<F>,
];

type MaybeRecursive<
  F extends ExprFunction,
  Iterations extends Prev[number],
  Args extends ('Here goes the function name' | BaseValue)[] = IndexHack<F>,
> = [Iterations] extends [never]
  ? never
  : {
      [Index in keyof Args]: Args[Index] extends BaseValue
        ?
            | BaseToActual<Args[Index]>
            | MaybeRecursive<FunctionsReturning<Args[Index]>, Prev[Iterations]>
        : F;
    };

/**
 * The base type that represents any valid expression function call. When used as a type
 * inside a layout definition, you probably want something like ExpressionOr<'boolean'>
 *
 * @see ExpressionOr
 */
export type Expression<F extends ExprFunction = ExprFunction> = MaybeRecursive<
  F,
  2
>;

/**
 * This type represents an expression for a function that returns the T type, or just the T type itself.
 */
export type ExpressionOr<T extends BaseValue> =
  | ExprReturning<T>
  | BaseToActual<T>;

/**
 * Type that lets you convert an expression function name to its return value type
 */
export type ReturnValueFor<Func extends ExprFunction> =
  Func extends keyof Functions
    ? BaseToActual<Functions[Func]['returns']>
    : never;

/**
 * This is the heavy lifter for ExprResolved that will recursively work through objects and remove
 * expressions (replacing them with the type the expression is expected to return).
 *
 * @see https://www.typescriptlang.org/docs/handbook/2/conditional-types.html#distributive-conditional-types
 */
type ResolveDistributive<T> = [T] extends [any]
  ? [T] extends [Expression<infer Func>]
    ? ReturnValueFor<Func>
    : T extends Expression
    ? // When using ExpressionOr<...>, it creates a union type. Removing the Expression from this union
      never
    : T extends object
    ? Exclude<ExprResolved<T>, Expression>
    : T
  : never;

/**
 * This type removes all expressions from the input type (replacing them with the type
 * the expression is expected to return)
 *
 * @see https://stackoverflow.com/a/54487392
 */
export type ExprResolved<T> = {
  [P in keyof T]: ResolveDistributive<T[P]>;
};

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
 * This is the heavy lifter used by ExprDefaultValues to recursively iterate types
 */
type ReplaceDistributive<T, Iterations extends Prev[number]> = [T] extends [
  ExpressionOr<infer BT>,
]
  ? BaseToActualStrict<BT>
  : [T] extends [object]
  ? OmitEmptyObjects<ExprDefaultValues<T, Prev[Iterations]>>
  : never;

/**
 * This type looks through an object recursively, finds any expressions, and requires you to provide a default
 * value for them (i.e. a fallback value should the expression evaluation fail).
 */
export type ExprDefaultValues<
  T,
  Iterations extends Prev[number] = 1, // <-- Recursion depth limited to 2 levels by default
> = [Iterations] extends [never]
  ? never
  : OmitNeverKeys<{
      [P in keyof Required<T>]: OmitNeverArrays<
        ReplaceDistributive<Exclude<T[P], undefined>, Iterations>
      >;
    }>;
