import { argTypeAt, ExprTypes } from 'src/features/expressions';
import {
  ExprFunctionDefinitions,
  ExprFunctionValidationExtensions,
} from 'src/features/expressions/expression-functions';
import { prettyErrors } from 'src/features/expressions/prettyErrors';
import { ExprVal } from 'src/features/expressions/types';
import type { AnyFuncDef, FuncValidationDef } from 'src/features/expressions/expression-functions';
import type { AnyExprArg, Expression, ExprFunction, ExprValToActualOrExpr } from 'src/features/expressions/types';

enum ValidationErrorMessage {
  InvalidType = 'Invalid type "%s"',
  FuncNotImpl = 'Function "%s" not implemented',
  ArgUnexpected = 'Unexpected argument',
  ArgWrongType = 'Expected argument to be %s, got %s',
  ArgsWrongNum = 'Expected %s argument(s), got %s',
  FuncMissing = 'Missing function name in expression',
  FuncNotString = 'Function name in expression should be string',
}

export interface ValidationContext {
  errors: {
    [key: string]: string[];
  };
}

const validBasicTypes: { [key: string]: ExprVal } = {
  boolean: ExprVal.Boolean,
  string: ExprVal.String,
  bigint: ExprVal.Number,
  number: ExprVal.Number,
};

export class InvalidExpression extends Error {}

export function addError(
  ctx: ValidationContext,
  path: string[],
  message: ValidationErrorMessage | string,
  ...params: string[]
) {
  let paramIdx = 0;
  const newMessage = message.replaceAll('%s', () => params[paramIdx++]);
  const stringPath = path.join('');
  if (ctx.errors[stringPath]) {
    ctx.errors[stringPath].push(newMessage);
  } else {
    ctx.errors[stringPath] = [newMessage];
  }
}

function validateFunctionArg(
  func: ExprFunction,
  idx: number,
  actual: (ExprVal | undefined)[],
  ctx: ValidationContext,
  path: string[],
) {
  const expectedType = argTypeAt(func, idx);
  const actualType = actual[idx];
  if (expectedType === undefined) {
    addError(ctx, [...path, `[${idx + 1}]`], ValidationErrorMessage.ArgUnexpected);
  } else {
    const targetType = ExprTypes[expectedType];

    if (actualType === undefined) {
      if (targetType.nullable) {
        return;
      }
      addError(ctx, [...path, `[${idx + 1}]`], ValidationErrorMessage.ArgWrongType, expectedType, 'null');
    } else if (!targetType.accepts.includes(actualType)) {
      addError(ctx, [...path, `[${idx + 1}]`], ValidationErrorMessage.ArgWrongType, expectedType, 'null');
    }
  }
}

function validateFunctionArgs(
  func: ExprFunction,
  actual: (ExprVal | undefined)[],
  ctx: ValidationContext,
  path: string[],
) {
  const expected = ExprFunctionDefinitions[func].args;
  const maxIdx = Math.max(expected.length, actual.length);
  for (let idx = 0; idx < maxIdx; idx++) {
    validateFunctionArg(func, idx, actual, ctx, path);
  }
}

function validateFunctionArgLength(
  func: ExprFunction,
  actual: (ExprVal | undefined)[],
  ctx: ValidationContext,
  path: string[],
) {
  const expected = ExprFunctionDefinitions[func].args as AnyExprArg[];
  if (expected.length === 0) {
    if (actual.length !== 0) {
      addError(ctx, path, ValidationErrorMessage.ArgsWrongNum, '0', `${actual.length}`);
    }
    return;
  }

  const firstOptionalIdx = expected.findIndex((arg) => arg.variant === 'optional' || arg.variant === 'rest');
  const minExpected = firstOptionalIdx === -1 ? expected.length : firstOptionalIdx;

  const lastArg = expected[expected.length - 1];
  const canSpread = lastArg?.variant === 'rest';
  if (canSpread && actual.length >= minExpected) {
    return;
  }

  const maxExpected = expected.length;
  if (actual.length < minExpected || actual.length > maxExpected) {
    let expected = `${minExpected}`;
    if (canSpread) {
      expected += '+';
    } else if (maxExpected !== minExpected) {
      expected += `-${maxExpected}`;
    }

    addError(ctx, path, ValidationErrorMessage.ArgsWrongNum, `${expected}`, `${actual.length}`);
  }
}

function validateFunction(
  funcName: unknown,
  rawArgs: unknown[],
  argTypes: (ExprVal | undefined)[],
  ctx: ValidationContext,
  path: string[],
): ExprVal | undefined {
  if (typeof funcName !== 'string') {
    addError(ctx, path, ValidationErrorMessage.InvalidType, typeof funcName);
    return;
  }

  const pathArgs = [...path.slice(0, path.length - 1)];

  if (funcName in ExprFunctionDefinitions) {
    validateFunctionArgs(funcName as ExprFunction, argTypes, ctx, pathArgs);

    const def = ExprFunctionDefinitions[funcName as ExprFunction] as AnyFuncDef;
    const validatorExt = ExprFunctionValidationExtensions[funcName] as FuncValidationDef | undefined;
    const numErrorsBefore = Object.keys(ctx.errors).length;
    if (validatorExt?.runNumArgsValidator !== false) {
      validateFunctionArgLength(funcName as ExprFunction, argTypes, ctx, pathArgs);
    }
    if (validatorExt?.validator && Object.keys(ctx.errors).length === numErrorsBefore) {
      // Skip the custom validator if the argument length is wrong
      validatorExt.validator({ rawArgs, argTypes, ctx, path: pathArgs });
    }

    return def.returns;
  }

  addError(ctx, path, ValidationErrorMessage.FuncNotImpl, funcName);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function validateExpr(expr: any[], ctx: ValidationContext, path: string[]) {
  if (expr.length < 1) {
    addError(ctx, path, ValidationErrorMessage.FuncMissing);
    return undefined;
  }

  if (typeof expr[0] !== 'string') {
    addError(ctx, path, ValidationErrorMessage.FuncNotString);
    return undefined;
  }

  const [func, ...rawArgs] = expr;
  const args: (ExprVal | undefined)[] = [];

  for (const argIdx in rawArgs) {
    const idx = parseInt(argIdx) + 1;
    args.push(validateRecursively(rawArgs[argIdx], ctx, [...path, `[${idx}]`]));
  }

  return validateFunction(func, rawArgs, args, ctx, [...path, '[0]']);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function validateRecursively(expr: any, ctx: ValidationContext, path: string[]): ExprVal | undefined {
  if (validBasicTypes[typeof expr]) {
    return validBasicTypes[typeof expr];
  }

  if (typeof expr === 'undefined' || expr === null) {
    return;
  }

  if (Array.isArray(expr)) {
    return validateExpr(expr, ctx, path);
  }

  addError(ctx, path, ValidationErrorMessage.InvalidType, typeof expr);
}

/**
 * Checks anything and returns true if it _could_ be an expression (but is not guaranteed to be one, and does not
 * validate the expression). This is `asExpression` light, without any error logging to console if it fails.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function canBeExpression(expr: any, checkIfValidFunction = false): expr is [] {
  const firstPass = Array.isArray(expr) && expr.length >= 1 && typeof expr[0] === 'string';
  if (checkIfValidFunction && firstPass) {
    return expr[0] in ExprFunctionDefinitions;
  }

  return firstPass;
}

const alreadyValidatedExpressions = new Map<string, boolean>();

/**
 * @param obj Input, can be anything
 * @param errorText Error intro text used when printing to console or throwing an error
 */
function isValidExpr(obj: unknown, errorText = 'Invalid expression'): obj is Expression {
  const cacheKey = JSON.stringify(obj);
  const previousRun = alreadyValidatedExpressions.get(cacheKey);
  if (typeof previousRun === 'boolean') {
    return previousRun;
  }

  const ctx: ValidationContext = { errors: {} };
  validateRecursively(obj, ctx, []);

  if (Object.keys(ctx.errors).length) {
    const pretty = prettyErrors({
      input: obj,
      errors: ctx.errors,
      indentation: 1,
    });
    const fullMessage = `${errorText}:\n${pretty}`;

    window.logError(fullMessage);
    alreadyValidatedExpressions.set(cacheKey, false);
    return false;
  }

  alreadyValidatedExpressions.set(cacheKey, true);
  return true;
}

function isScalar(val: unknown, type: ExprVal | undefined) {
  if (val === null || val === undefined) {
    return true;
  }

  if (type === ExprVal.String) {
    return typeof val === 'string';
  }
  if (type === ExprVal.Number) {
    return typeof val === 'number';
  }
  if (type === ExprVal.Boolean) {
    return typeof val === 'boolean';
  }

  return typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean';
}

function isValidOrScalar<EV extends ExprVal>(
  obj: unknown,
  type: EV,
  errorText?: string,
): obj is ExprValToActualOrExpr<EV>;
// eslint-disable-next-line no-redeclare
function isValidOrScalar(obj: unknown, type?: undefined, errorText?: string): obj is ExprValToActualOrExpr<ExprVal.Any>;
// eslint-disable-next-line no-redeclare
function isValidOrScalar(obj: unknown, type?: ExprVal, errorText?: string): boolean {
  return isScalar(obj, type) || isValidExpr(obj, errorText);
}

function throwIfInvalid<EV extends ExprVal>(obj: unknown, type: EV, errorText?: string): void;
// eslint-disable-next-line no-redeclare
function throwIfInvalid(obj: unknown, type?: undefined, errorText?: string): void;
// eslint-disable-next-line no-redeclare
function throwIfInvalid(obj: unknown, type?: ExprVal, errorText?: string): void {
  if (Array.isArray(obj) && !isScalar(obj, type)) {
    const ctx: ValidationContext = { errors: {} };
    validateRecursively(obj, ctx, []);

    if (Object.keys(ctx.errors).length) {
      const pretty = prettyErrors({
        input: obj,
        errors: ctx.errors,
        indentation: 1,
      });
      const fullMessage = `${errorText}:\n${pretty}`;
      throw new InvalidExpression(fullMessage);
    }
  }
}

export const ExprValidation = {
  /**
   * Takes the input object, validates it to make sure it is a valid expression OR a simple scalar that can be
   * used in place of an expression. If the expression is invalid, an error is logged to the developer tools
   * (unless the same expression has logged errors before).
   */
  isValidOrScalar,

  /**
   * Checks an input object and only returns true if it is an expression, and that expression is valid.
   */
  isValid(obj: unknown, errorText?: string): obj is Expression {
    return Array.isArray(obj) && isValidExpr(obj, errorText);
  },

  /**
   * The same as the above, but just throws an error if the expression fails. Useful for tests, etc.
   */
  throwIfInvalid,
};
