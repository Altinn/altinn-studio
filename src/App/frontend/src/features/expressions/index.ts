import { isValid, parseISO } from 'date-fns';
import dot from 'dot-object';

import {
  ExprRuntimeError,
  traceExpressionError,
  UnexpectedType,
  UnknownArgType,
  UnknownTargetType,
} from 'src/features/expressions/errors';
import { ExprFunctionDefinitions, ExprFunctionImplementations } from 'src/features/expressions/expression-functions';
import { ExprVal } from 'src/features/expressions/types';
import { type ExpressionDataSources } from 'src/utils/layout/useExpressionDataSources';
import type {
  ExprConfig,
  ExprDate,
  ExprDateExtensions,
  Expression,
  ExprFunctionName,
  ExprPositionalArgs,
  ExprValToActual,
  ExprValToActualOrExpr,
  ExprValueArgs,
} from 'src/features/expressions/types';

type BeforeFuncCallback = (path: string[], func: ExprFunctionName, args: unknown[]) => void;
type AfterFuncCallback = (path: string[], func: ExprFunctionName, args: unknown[], result: unknown) => void;

export interface EvalExprOptions<V extends ExprVal = ExprVal> extends ExprConfig<V> {
  errorIntroText?: string;
  onBeforeFunctionCall?: BeforeFuncCallback;
  onAfterFunctionCall?: AfterFuncCallback;
  positionalArguments?: ExprPositionalArgs;
  valueArguments?: ExprValueArgs;
}

export type SimpleEval<T extends ExprVal> = (
  expr: ExprValToActualOrExpr<T> | undefined,
  defaultValue: ExprValToActual<T>,
  dataSources?: Partial<ExpressionDataSources>,
) => ExprValToActual<T>;

type Source = keyof ExpressionDataSources;
export type EvaluateExpressionParams<DataSources extends readonly Source[] = Source[]> = {
  expr: Expression;
  path: string[];
  callbacks: { onBeforeFunctionCall?: BeforeFuncCallback; onAfterFunctionCall?: AfterFuncCallback };
  dataSources: Pick<ExpressionDataSources, DataSources[number]>;
  positionalArguments?: ExprPositionalArgs;
  valueArguments?: ExprValueArgs;
};

/**
 * Simple (non-validating) check to make sure an input is an expression.
 * @see ExprValidation
 */
function isExpression(input: unknown): input is Expression {
  return (
    !!input &&
    Array.isArray(input) &&
    input.length >= 1 &&
    typeof input[0] === 'string' &&
    Object.keys(ExprFunctionDefinitions).includes(input[0])
  );
}

/**
 * Run/evaluate an expression. You have to provide your own context containing functions for looking up external values.
 */
export function evalExpr<V extends ExprVal = ExprVal>(
  expr: ExprValToActualOrExpr<V> | undefined,
  dataSources: ExpressionDataSources,
  options: EvalExprOptions,
): ExprValToActual<V> {
  if (!isExpression(expr)) {
    return expr as ExprValToActual<V>;
  }

  const callbacks = {
    onBeforeFunctionCall: options.onBeforeFunctionCall,
    onAfterFunctionCall: options.onAfterFunctionCall,
  };
  const evalParams: EvaluateExpressionParams = {
    expr,
    path: [],
    callbacks,
    dataSources,
    positionalArguments: options.positionalArguments,
    valueArguments: options.valueArguments,
  };

  try {
    const result = innerEvalExpr(evalParams);
    if (result === null || result === undefined) {
      return options.defaultValue as ExprValToActual<V>;
    }

    if (options.returnType !== ExprVal.Any && options.returnType !== valueToExprValueType(result)) {
      // If you have an expression that expects (for example) a true|false return value, and the actual returned result
      // is "true" (as a string), it makes sense to finally cast the value to the proper return value type.
      return exprCastValue(result, options.returnType, evalParams) as ExprValToActual<V>;
    }

    return result as ExprValToActual<V>;
  } catch (err) {
    const { expr: errorExpr, path: errorPath } =
      err instanceof ExprRuntimeError
        ? { expr: err.expression, path: err.path }
        : { expr: evalParams.expr, path: evalParams.path };

    // When we know of a default value, we can safely print it as an error to the console and safely recover
    traceExpressionError(err, errorExpr, errorPath, {
      config: options,
      ...(options.errorIntroText ? { introText: options.errorIntroText } : {}),
    });
    return options.defaultValue as ExprValToActual<V>;
  }
}

export function argTypeAt(func: ExprFunctionName, argIndex: number): ExprVal | undefined {
  const funcDef = ExprFunctionDefinitions[func];
  const possibleArgs = funcDef.args;
  const maybeReturn = possibleArgs[argIndex]?.type;
  if (maybeReturn) {
    return maybeReturn;
  }

  const lastArg = funcDef.args[funcDef.args.length - 1];
  const lastArgSpreads = lastArg?.variant === 'rest';
  if (lastArg && lastArgSpreads) {
    return lastArg.type;
  }

  return undefined;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function innerEvalExpr(params: EvaluateExpressionParams): any {
  const { expr, path } = params;
  const stringPath = stringifyPath(path);

  const [func, ...args] = stringPath ? dot.pick(stringPath, expr, false) : expr;
  const returnType = ExprFunctionDefinitions[func].returns;

  const computedArgs = args.map((arg: unknown, idx: number) => {
    const realIdx = idx + 1;

    const paramsWithNewPath = { ...params, path: [...path, `[${realIdx}]`] };
    const argValue = Array.isArray(arg) ? innerEvalExpr(paramsWithNewPath) : arg;
    const argType = argTypeAt(func, idx);
    return exprCastValue(argValue, argType, paramsWithNewPath);
  });

  const { onBeforeFunctionCall, onAfterFunctionCall } = params.callbacks;

  const actualFunc = ExprFunctionImplementations[func];

  onBeforeFunctionCall?.(path, func, computedArgs);
  const returnValue = actualFunc.apply(params, computedArgs);
  const returnValueCasted = exprCastValue(returnValue, returnType, params);
  onAfterFunctionCall?.(path, func, computedArgs, returnValueCasted);

  return returnValueCasted;
}

function stringifyPath(path: string[]): string | undefined {
  if (path.length === 0) {
    return undefined;
  }

  const [firstKey, ...restKeys] = path;
  // For some reason dot.pick wants to use the format '0[1][2]' for arrays instead of '[0][1][2]', so we'll rewrite
  return firstKey.replace('[', '').replace(']', '') + restKeys.join('');
}

function valueToExprValueType(value: unknown): ExprVal {
  switch (typeof value) {
    case 'number':
    case 'bigint':
      return ExprVal.Number;
    case 'string':
      return ExprVal.String;
    case 'boolean':
      return ExprVal.Boolean;
    default:
      return ExprVal.Any;
  }
}

/**
 * This function is used to cast any value to a target type before/after it is passed
 * through a function call.
 */
export function exprCastValue<T extends ExprVal>(
  value: unknown,
  toType: T | undefined,
  context: EvaluateExpressionParams<[]>,
): ExprValToActual<T> | null {
  if (!toType || !(toType in ExprTypes)) {
    throw new UnknownTargetType(context.expr, context.path, toType ? toType : typeof toType);
  }

  const typeObj = ExprTypes[toType];

  if (typeObj.nullable && (value === null || value === undefined || value === 'null')) {
    return null;
  }

  const valueType = valueToExprValueType(value);
  if (!typeObj.accepts.includes(valueType)) {
    throw new UnknownArgType(context.expr, context.path, valueType.replaceAll('_', ''), toType.replaceAll('_', ''));
  }

  return typeObj.impl.apply(context, [value]);
}

function asNumber(arg: string) {
  if (arg.match(/^-?\d+$/)) {
    return parseInt(arg, 10);
  }
  if (arg.match(/^-?\d+\.\d+$/)) {
    return parseFloat(arg);
  }

  return undefined;
}

/**
 * All the types available in expressions, along with functions to cast possible values to them
 * @see exprCastValue
 */
export const ExprTypes: {
  [Type in ExprVal]: {
    nullable: boolean;
    accepts: ExprVal[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    impl: (this: EvaluateExpressionParams, arg: any) => ExprValToActual<Type> | null;
  };
} = {
  [ExprVal.Boolean]: {
    nullable: true,
    accepts: [ExprVal.Boolean, ExprVal.String, ExprVal.Number, ExprVal.Any],
    impl(arg) {
      if (typeof arg === 'boolean') {
        return arg;
      }
      if (arg === 'true') {
        return true;
      }
      if (arg === 'false') {
        return false;
      }

      if (typeof arg === 'string' || typeof arg === 'number' || typeof arg === 'bigint') {
        const num = typeof arg === 'string' ? asNumber(arg) : arg;
        if (num !== undefined) {
          if (num === 1) {
            return true;
          }
          if (num === 0) {
            return false;
          }
        }
      }

      throw new UnexpectedType(this.expr, this.path, 'boolean', arg);
    },
  },
  [ExprVal.String]: {
    nullable: true,
    accepts: [ExprVal.Boolean, ExprVal.String, ExprVal.Number, ExprVal.Any],
    impl(arg) {
      if (['number', 'bigint', 'boolean'].includes(typeof arg)) {
        return JSON.stringify(arg);
      }

      // Always lowercase these values, to make comparisons case-insensitive
      if (arg.toLowerCase() === 'null') {
        return null;
      }
      if (arg.toLowerCase() === 'false') {
        return 'false';
      }
      if (arg.toLowerCase() === 'true') {
        return 'true';
      }

      return `${arg}`;
    },
  },
  [ExprVal.Number]: {
    nullable: true,
    accepts: [ExprVal.Boolean, ExprVal.String, ExprVal.Number, ExprVal.Any],
    impl(arg) {
      if (typeof arg === 'number' || typeof arg === 'bigint') {
        return arg as number;
      }
      if (typeof arg === 'string') {
        const num = asNumber(arg);
        if (num !== undefined) {
          return num;
        }
      }

      throw new UnexpectedType(this.expr, this.path, 'number', arg);
    },
  },
  [ExprVal.Any]: {
    nullable: true,
    accepts: [ExprVal.Boolean, ExprVal.String, ExprVal.Number, ExprVal.Any],
    impl: (arg) => arg,
  },
  [ExprVal.Date]: {
    nullable: true,
    accepts: [ExprVal.String, ExprVal.Date, ExprVal.Any],
    impl(arg) {
      if (typeof arg === 'number') {
        return exprParseDate(this, String(arg)); // Might be just a 4-digit year
      }

      if (typeof arg === 'string') {
        return arg ? exprParseDate(this, arg) : null;
      }

      throw new UnexpectedType(this.expr, this.path, 'date', arg);
    },
  },
};

/**
 * Strict date parser. We don't want to support all the formats that Date.parse() and parseISO() supports, because that
 * would make it more difficult to implement the same functionality on the backend. For that reason, we
 * limit ourselves to simple ISO 8601 dates + the format DateTime is serialized to JSON in. There are shared tests
 * for this in the `formatDate` function folder.
 */
const datePattern =
  /^[0-9]{4}-[0-9]{2}-[0-9]{2}(?:[ Tt][0-9]{2}:[0-9]{2}(?::[0-9]{2}(\.[0-9]{1,9})?)?([Zz]|[+-][0-9]{2}:[0-9]{2})?)?$/;

function exprParseDate(ctx: EvaluateExpressionParams, _date: string): ExprDate | null {
  const date = _date.toUpperCase();
  const match = datePattern.exec(date);
  if (!match) {
    // To maintain compatibility with the backend, we only allow the above regex to be parsed
    if (date.trim() !== '') {
      throw new ExprRuntimeError(ctx.expr, ctx.path, `Unable to parse date "${date}": Unknown format`);
    }

    return null;
  }

  // Special case that parseISO doesn't catch: Time zone offset cannot be +- >= 24 hours
  const lastGroup = match[match.length - 1];
  if (lastGroup && (lastGroup.startsWith('-') || lastGroup.startsWith('+'))) {
    const offsetHours = parseInt(lastGroup.substring(1, 3), 10);
    if (offsetHours >= 24) {
      throw new ExprRuntimeError(
        ctx.expr,
        ctx.path,
        `Unable to parse date "${date}": Format was recognized, but the date/time is invalid`,
      );
    }
  }

  const parsed = parseISO(date);
  if (!isValid(parsed.getTime())) {
    throw new ExprRuntimeError(
      ctx.expr,
      ctx.path,
      `Unable to parse date "${date}": Format was recognized, but the date/time is invalid`,
    );
  }

  // Special case that parseISO gets wrong: Fractional seconds with more than 3 digits
  // https://github.com/date-fns/date-fns/issues/3194
  // https://github.com/date-fns/date-fns/pull/3199
  if (match[1]) {
    // This is a sloppy workaround, and not really a fix. By just setting the correct amount of milliseconds we
    // fix our shared tests to match the backend, but if you have an edge-case like 31.12.2021 23:59:59.9999999
    // the parseISO function will think it's 2022. Saying it's really 01.01.2022 00:00:00.999 (like we're doing here)
    // may look like we're just making things worse, but in most cases high precision fractionals will not roll you
    // over to the next second (let alone the next year).
    const ms = parseInt(match[1].substring(1, 4).padEnd(3, '0'), 10);
    parsed.setMilliseconds(ms);
  }

  const isUtc = match[2] === 'Z' || match[2] === '+00:00' || match[2] === '-00:00';
  const extensions: ExprDateExtensions = {
    raw: date,
    timeZone: isUtc ? 'utc' : match[2] ? match[2] : 'local',
  };

  return Object.assign(parsed, { exprDateExtensions: extensions });
}
