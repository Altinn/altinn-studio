import { isValid, parseISO } from 'date-fns';
import dot from 'dot-object';

import {
  ExprRuntimeError,
  prettyError,
  traceExpressionError,
  UnexpectedType,
  UnknownSourceType,
  UnknownTargetType,
} from 'src/features/expressions/errors';
import { ExprFunctionDefinitions, ExprFunctionImplementations } from 'src/features/expressions/expression-functions';
import { ExprVal } from 'src/features/expressions/types';
import type { NodeNotFoundWithoutContext } from 'src/features/expressions/errors';
import type {
  ExprConfig,
  Expression,
  ExprFunction,
  ExprPositionalArgs,
  ExprValToActual,
  ExprValToActualOrExpr,
  ExprValueArgs,
} from 'src/features/expressions/types';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';
import type { LayoutPage } from 'src/utils/layout/LayoutPage';
import type { ExpressionDataSources } from 'src/utils/layout/useExpressionDataSources';

type BeforeFuncCallback = (path: string[], func: ExprFunction, args: unknown[]) => void;
type AfterFuncCallback = (path: string[], func: ExprFunction, args: unknown[], result: unknown) => void;

export interface EvalExprOptions {
  config?: ExprConfig;
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

export type EvaluateExpressionParams = {
  expr: Expression;
  path: string[];
  callbacks: { onBeforeFunctionCall?: BeforeFuncCallback; onAfterFunctionCall?: AfterFuncCallback };
  node: LayoutNode | LayoutPage | NodeNotFoundWithoutContext;
  dataSources: ExpressionDataSources;
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
  node: LayoutNode | LayoutPage | NodeNotFoundWithoutContext,
  dataSources: ExpressionDataSources,
  options?: EvalExprOptions,
) {
  if (!isExpression(expr)) {
    return expr;
  }

  const callbacks = {
    onBeforeFunctionCall: options?.onBeforeFunctionCall,
    onAfterFunctionCall: options?.onAfterFunctionCall,
  };
  const evalParams: EvaluateExpressionParams = {
    expr,
    path: [],
    callbacks,
    node,
    dataSources,
    positionalArguments: options?.positionalArguments,
    valueArguments: options?.valueArguments,
  };

  try {
    const result = innerEvalExpr(evalParams);
    if ((result === null || result === undefined) && options?.config) {
      return options.config.defaultValue;
    }

    if (
      !!options?.config?.returnType &&
      options.config.returnType !== ExprVal.Any &&
      options.config.returnType !== valueToExprValueType(result)
    ) {
      // If you have an expression that expects (for example) a true|false return value, and the actual returned result
      // is "true" (as a string), it makes sense to finally cast the value to the proper return value type.
      return exprCastValue(result, options.config.returnType, evalParams);
    }

    return result;
  } catch (err) {
    const { expr: errorExpr, path: errorPath } =
      err instanceof ExprRuntimeError
        ? { expr: err.expression, path: err.path }
        : { expr: evalParams.expr, path: evalParams.path };

    if (options && options.config) {
      // When we know of a default value, we can safely print it as an error to the console and safely recover
      traceExpressionError(err, errorExpr, errorPath, {
        config: options.config,
        ...(options.errorIntroText ? { introText: options.errorIntroText } : {}),
      });
      return options.config.defaultValue;
    } else {
      // We cannot possibly know the expected default value here, so there are no safe ways to fail here except
      // throwing the exception to let everyone know we failed.
      throw new Error(prettyError(err, errorExpr, errorPath));
    }
  }
}

export function argTypeAt(func: ExprFunction, argIndex: number): ExprVal | undefined {
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
  context: EvaluateExpressionParams,
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
    const supported = [...typeObj.accepts, ...(typeObj.nullable ? ['null'] : [])].join(', ');
    throw new UnknownSourceType(context.expr, context.path, typeof value, supported);
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
    accepts: [ExprVal.String, ExprVal.Number, ExprVal.Date, ExprVal.Any],
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
 * Strict date parser. We don't want to support all the formats that Date.parse() supports, because that
 * would make it more difficult to implement the same functionality on the backend. For that reason, we
 * limit ourselves to simple ISO 8601 dates + the format DateTime is serialized to JSON in.
 */
const datePatterns = [
  /^(\d{4})$/,
  /^(\d{4})-(\d{2})-(\d{2})T?$/,
  /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})Z?([+-]\d{2}:\d{2})?$/,
  /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})Z?([+-]\d{2}:\d{2})?$/,
  /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})\.(\d+)Z?([+-]\d{2}:\d{2})?$/,
];

function exprParseDate(ctx: EvaluateExpressionParams, _date: string): Date | null {
  const date = _date.toUpperCase();
  for (const regexIdx in datePatterns) {
    const regex = datePatterns[regexIdx];
    const match = regex.exec(date);
    if (!match) {
      // To maintain compatibility with the backend, we only allow the above regexes to be parsed
      continue;
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
    if (regexIdx === '4' && match[7] && match[7].length > 3) {
      // This is a sloppy workaround, and not really a fix. By just setting the correct amount of milliseconds we
      // fix our shared tests to match the backend, but if you have an edge-case like 31.12.2021 23:59:59.9999999
      // the parseISO function will think it's 2022. Saying it's really 01.01.2022 00:00:00.999 (like we're doing here)
      // may look like we're just making things worse, but in most cases high precision fractionals will not roll you
      // over to the next second (let alone the next year).
      const ms = parseInt(match[7].substring(0, 3), 10);
      parsed.setMilliseconds(ms);
    }

    return parsed;
  }

  if (date.trim() !== '') {
    throw new ExprRuntimeError(ctx.expr, ctx.path, `Unable to parse date "${date}": Unknown format`);
  }

  return null;
}
