import {
  argTypeAt,
  ExprConfigForComponent,
  ExprConfigForGroup,
  ExprFunctions,
  ExprTypes,
  getConfigFor,
} from 'src/features/expressions';
import { prettyErrors, prettyErrorsToConsole } from 'src/features/expressions/prettyErrors';
import type {
  BaseValue,
  ExprConfig,
  Expression,
  ExprFunction,
  ExprObjConfig,
  FuncDef,
} from 'src/features/expressions/types';
import type { ILayout } from 'src/layout/layout';

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

const validBasicTypes: { [key: string]: BaseValue } = {
  boolean: 'boolean',
  string: 'string',
  bigint: 'number',
  number: 'number',
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
  actual: (BaseValue | undefined)[],
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
  actual: (BaseValue | undefined)[],
  ctx: ValidationContext,
  path: string[],
) {
  const expected = ExprFunctions[func].args;
  const maxIdx = Math.max(expected.length, actual.length);
  for (let idx = 0; idx < maxIdx; idx++) {
    validateFunctionArg(func, idx, actual, ctx, path);
  }
}

function validateFunctionArgLength(
  func: ExprFunction,
  actual: (BaseValue | undefined)[],
  ctx: ValidationContext,
  path: string[],
) {
  const expected = ExprFunctions[func].args;

  let minExpected = ExprFunctions[func]?.minArguments;
  if (minExpected === undefined) {
    minExpected = expected.length;
  }

  const canSpread = ExprFunctions[func].lastArgSpreads;
  if (canSpread && actual.length >= minExpected) {
    return;
  }

  if (actual.length !== minExpected) {
    addError(
      ctx,
      path,
      ValidationErrorMessage.ArgsWrongNum,
      `${minExpected}${canSpread ? '+' : ''}`,
      `${actual.length}`,
    );
  }
}

function validateFunction(
  funcName: any,
  rawArgs: any[],
  argTypes: (BaseValue | undefined)[],
  ctx: ValidationContext,
  path: string[],
): BaseValue | undefined {
  if (typeof funcName !== 'string') {
    addError(ctx, path, ValidationErrorMessage.InvalidType, typeof funcName);
    return;
  }

  const pathArgs = [...path.slice(0, path.length - 1)];

  if (funcName in ExprFunctions) {
    validateFunctionArgs(funcName as ExprFunction, argTypes, ctx, pathArgs);

    const def = ExprFunctions[funcName] as FuncDef<any, any>;
    if (def.validator) {
      def.validator({ rawArgs, argTypes, ctx, path: pathArgs });
    } else {
      validateFunctionArgLength(funcName as ExprFunction, argTypes, ctx, pathArgs);
    }

    return def.returns;
  }

  addError(ctx, path, ValidationErrorMessage.FuncNotImpl, funcName);
}

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
  const args: (BaseValue | undefined)[] = [];

  for (const argIdx in rawArgs) {
    const idx = parseInt(argIdx) + 1;
    args.push(validateRecursively(rawArgs[argIdx], ctx, [...path, `[${idx}]`]));
  }

  return validateFunction(func, rawArgs, args, ctx, [...path, '[0]']);
}

function validateRecursively(expr: any, ctx: ValidationContext, path: string[]): BaseValue | undefined {
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
export function canBeExpression(expr: any): expr is [] {
  return Array.isArray(expr) && expr.length >= 1 && typeof expr[0] === 'string';
}

/**
 * Takes the input object, validates it to make sure it is a valid expression, returns either a fully
 * parsed expression (ready to pass to evalExpr()), or undefined (if not a valid expression).
 *
 * @param obj Input, can be anything
 * @param config Configuration and default value (the default is returned if the expression fails to validate)
 * @param errorText Error intro text used when printing to console or throwing an error
 */
export function asExpression(obj: any, config?: ExprConfig, errorText = 'Invalid expression'): Expression | undefined {
  if (typeof obj !== 'object' || obj === null || !Array.isArray(obj)) {
    return undefined;
  }

  const ctx: ValidationContext = { errors: {} };
  validateRecursively(obj, ctx, []);

  if (Object.keys(ctx.errors).length) {
    if (typeof config !== 'undefined') {
      const prettyPrinted = prettyErrorsToConsole({
        input: obj,
        errors: ctx.errors,
        indentation: 1,
        defaultStyle: '',
      });

      // eslint-disable-next-line no-console
      console.log(
        [
          `${errorText}:`,
          prettyPrinted.lines,
          '%cUsing default value instead:',
          `  %c${config.defaultValue === null ? 'null' : (config.defaultValue as any).toString()}%c`,
        ].join('\n'),
        ...prettyPrinted.css,
        ...['', 'color: red;', ''],
      );

      return config.defaultValue;
    }

    const pretty = prettyErrors({
      input: obj,
      errors: ctx.errors,
      indentation: 1,
    });
    throw new InvalidExpression(`${errorText}:\n${pretty}`);
  }

  return obj as unknown as Expression;
}

export function preProcessItem<T>(
  input: T,
  config: ExprObjConfig<any>,
  componentPath: string[],
  componentId: string,
): any {
  const pathStr = componentPath.join('.');
  const cfg = getConfigFor(componentPath, config);
  if (cfg) {
    if (typeof input === 'object' && input !== null) {
      const errText = `Invalid expression when parsing ${pathStr} for "${componentId}"`;
      return asExpression(input, cfg, errText);
    }

    return input;
  }

  if (typeof input === 'object' && !Array.isArray(input) && input !== null) {
    for (const property of Object.keys(input)) {
      input[property] = preProcessItem(input[property], config, [...componentPath, property], componentId);
    }
  }

  return input;
}

/**
 * Pre-process a layout array. This iterates all components and makes sure to validate expressions (making sure they
 * are valid according to the Expression TypeScript type, ready to pass to evalExpr()).
 *
 * If/when expressions inside components does not validate correctly, a warning is printed to the console, and the
 * expression is substituted with the appropriate default value.
 *
 * Please note: This mutates the layout array passed to the function, and returns nothing.
 */
export function preProcessLayout(layout: ILayout) {
  const config = {
    ...ExprConfigForComponent,
    ...ExprConfigForGroup,
  };

  for (const comp of layout) {
    preProcessItem(comp, config, [], comp.id);
  }
}
