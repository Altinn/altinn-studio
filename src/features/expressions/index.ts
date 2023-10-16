import dot from 'dot-object';
import type { Mutable } from 'utility-types';

import {
  ExprRuntimeError,
  NodeNotFoundWithoutContext,
  UnexpectedType,
  UnknownSourceType,
  UnknownTargetType,
} from 'src/features/expressions/errors';
import { ExprContext } from 'src/features/expressions/ExprContext';
import { ExprVal } from 'src/features/expressions/types';
import { addError, asExpression, canBeExpression } from 'src/features/expressions/validation';
import { implementsDisplayData } from 'src/layout';
import { BaseLayoutNode } from 'src/utils/layout/LayoutNode';
import { LayoutPage } from 'src/utils/layout/LayoutPage';
import type { ContextDataSources } from 'src/features/expressions/ExprContext';
import type {
  ExprConfig,
  Expression,
  ExprFunction,
  ExprObjConfig,
  ExprPositionalArgs,
  ExprResolved,
  ExprValToActual,
  FuncDef,
} from 'src/features/expressions/types';
import type { CompGroupExternal } from 'src/layout/Group/config.generated';
import type { CompExternal } from 'src/layout/layout';
import type { IAuthContext, IInstanceContext } from 'src/types/shared';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export interface EvalExprOptions {
  config?: ExprConfig;
  errorIntroText?: string;
  onBeforeFunctionCall?: (path: string[], func: ExprFunction, args: any[]) => void;
  onAfterFunctionCall?: (path: string[], func: ExprFunction, args: any[], result: any) => void;
  positionalArguments?: ExprPositionalArgs;
}

export interface EvalExprInObjArgs<T> {
  input: T;
  node: LayoutNode | NodeNotFoundWithoutContext;
  dataSources: ContextDataSources;
  config?: ExprObjConfig<T>;
  resolvingPerRow?: boolean;
  deleteNonExpressions?: boolean;
}

/**
 * Magic key used to indicate a config value for all possible values in an object
 */
export const CONFIG_FOR_ALL_VALUES_IN_OBJ = '__default__';

/**
 * This function will find any expressions inside a deep object and resolve them
 */
export function evalExprInObj<T>(args: EvalExprInObjArgs<T>): ExprResolved<T> {
  if (!args.input) {
    return args.input as ExprResolved<T>;
  }

  const out = evalExprInObjectRecursive<T>(args.input, args as Omit<EvalExprInObjArgs<T>, 'input'>, []);

  if (args.deleteNonExpressions && out === DELETE_LATER) {
    return {} as any;
  }

  return out;
}

export function getConfigFor(path: string[], config: ExprObjConfig<any>): ExprConfig<any> | undefined {
  const pathString = path.join('.');
  const pathStringAnyDefault = [...path.slice(0, path.length - 1), CONFIG_FOR_ALL_VALUES_IN_OBJ].join('.');
  const configSpecific = dot.pick(pathString, config);
  const configGeneric = dot.pick(pathStringAnyDefault, config);

  if (typeof configSpecific !== 'undefined' && 'returnType' in configSpecific) {
    return configSpecific;
  }

  if (typeof configGeneric !== 'undefined' && 'returnType' in configGeneric) {
    return configGeneric;
  }

  return undefined;
}

const DELETE_LATER = '__DELETE_LATER__';

/**
 * Recurse through an input object/array/any, finds expressions and evaluates them
 */
function evalExprInObjectRecursive<T>(input: any, args: Omit<EvalExprInObjArgs<T>, 'input'>, path: string[]) {
  if (typeof input !== 'object' || input === null) {
    if (args.deleteNonExpressions) {
      return DELETE_LATER;
    }

    return input;
  }

  if (Array.isArray(input)) {
    let config: ExprConfig<any> | undefined = undefined;
    let evaluateAsExpression = false;
    if (args.config) {
      config = getConfigFor(path, args.config);
      evaluateAsExpression = typeof config !== 'undefined';
    } else if (canBeExpression(input)) {
      evaluateAsExpression = true;
    }

    if (args.resolvingPerRow === false && config && config.resolvePerRow) {
      // Leave some expressions deep inside objects alone. I.e., for Group components, some of the properties should
      // only be evaluated in the context of each row (when the Group is repeating).
      evaluateAsExpression = false;
    }

    if (evaluateAsExpression) {
      const expression = asExpression(input);
      if (expression) {
        if (!Array.isArray(expression)) {
          return expression;
        }

        return evalExprInObjectCaller<T>(expression, args, path);
      }
    }

    const newPath = [...path];
    const lastLeg = newPath.pop() || '';
    const out = input
      .map((item, idx) => evalExprInObjectRecursive<T>(item, args, [...newPath, `${lastLeg}[${idx}]`]))
      .filter((item) => item !== DELETE_LATER);

    if (args.deleteNonExpressions && out.length === 0) {
      return DELETE_LATER;
    }

    return out;
  }

  const out = {};
  for (const key of Object.keys(input)) {
    out[key] = evalExprInObjectRecursive<T>(input[key], args, [...path, key]);
    if (out[key] === DELETE_LATER) {
      delete out[key];
    }
  }

  if (args.deleteNonExpressions && Object.keys(out).length === 0) {
    return DELETE_LATER;
  }

  return out;
}

/**
 * Extracted function for evaluating expressions in the context of a larger object
 */
function evalExprInObjectCaller<T>(expr: Expression, args: Omit<EvalExprInObjArgs<T>, 'input'>, path: string[]) {
  const pathString = path.join('.');
  const nodeId = args.node instanceof NodeNotFoundWithoutContext ? args.node.nodeId : args.node.item.id;

  const exprOptions: EvalExprOptions = {
    config: args.config && getConfigFor(path, args.config),
    errorIntroText: `Evaluated expression for '${pathString}' in component '${nodeId}'`,
  };

  return evalExpr(expr, args.node, args.dataSources, exprOptions);
}

/**
 * Run/evaluate an expression. You have to provide your own context containing functions for looking up external
 * values. If you need a more concrete implementation:
 * @see evalExprInObj
 */
export function evalExpr(
  expr: Expression,
  node: LayoutNode | LayoutPage | NodeNotFoundWithoutContext,
  dataSources: ContextDataSources,
  options?: EvalExprOptions,
) {
  let ctx = ExprContext.withBlankPath(
    expr,
    node,
    dataSources,
    {
      onBeforeFunctionCall: options?.onBeforeFunctionCall,
      onAfterFunctionCall: options?.onAfterFunctionCall,
    },
    options?.positionalArguments,
  );
  try {
    const result = innerEvalExpr(ctx);
    if ((result === null || result === undefined) && options && options.config) {
      return options.config.defaultValue;
    }

    if (
      options &&
      options.config &&
      options.config.returnType !== ExprVal.Any &&
      options.config.returnType !== valueToExprValueType(result)
    ) {
      // If you have an expression that expects (for example) a true|false return value, and the actual returned result
      // is "true" (as a string), it makes sense to finally cast the value to the proper return value type.
      return castValue(result, options.config.returnType, ctx);
    }

    return result;
  } catch (err) {
    if (err instanceof ExprRuntimeError) {
      ctx = err.context;
    } else {
      throw err;
    }
    if (options && options.config && !options.config.errorAsException) {
      // When we know of a default value, we can safely print it as an error to the console and safely recover
      ctx.trace(err, {
        config: options.config,
        ...(options.errorIntroText ? { introText: options.errorIntroText } : {}),
      });
      return options.config.defaultValue;
    } else {
      // We cannot possibly know the expected default value here, so there are no safe ways to fail here except
      // throwing the exception to let everyone know we failed.
      throw new Error(ctx.prettyError(err));
    }
  }
}

export function argTypeAt(func: ExprFunction, argIndex: number): ExprVal | undefined {
  const funcDef = ExprFunctions[func];
  const possibleArgs = funcDef.args;
  const maybeReturn = possibleArgs[argIndex];
  if (maybeReturn) {
    return maybeReturn;
  }

  if (funcDef.lastArgSpreads) {
    return possibleArgs[possibleArgs.length - 1];
  }

  return undefined;
}

function innerEvalExpr(context: ExprContext) {
  const [func, ...args] = context.getExpr();

  const returnType = ExprFunctions[func].returns;

  const computedArgs = args.map((arg, idx) => {
    const realIdx = idx + 1;
    const argContext = ExprContext.withPath(context, [...context.path, `[${realIdx}]`]);

    const argValue = Array.isArray(arg) ? innerEvalExpr(argContext) : arg;
    const argType = argTypeAt(func, idx);
    return castValue(argValue, argType, argContext);
  });

  const { onBeforeFunctionCall, onAfterFunctionCall } = context.callbacks;

  const actualFunc: (...args: any) => any = ExprFunctions[func].impl;

  onBeforeFunctionCall && onBeforeFunctionCall(context.path, func, computedArgs);
  const returnValue = actualFunc.apply(context, computedArgs);
  const returnValueCasted = castValue(returnValue, returnType, context);
  onAfterFunctionCall && onAfterFunctionCall(context.path, func, computedArgs, returnValueCasted);

  return returnValueCasted;
}

function valueToExprValueType(value: any): ExprVal {
  if (typeof value === 'number' || typeof value === 'bigint') {
    return ExprVal.Number;
  }
  if (typeof value === 'string') {
    return ExprVal.String;
  }
  if (typeof value === 'boolean') {
    return ExprVal.Boolean;
  }
  return ExprVal.Any;
}

function isLikeNull(arg: any) {
  return arg === 'null' || arg === null || typeof arg === 'undefined';
}

/**
 * This function is used to cast any value to a target type before/after it is passed
 * through a function call.
 */
function castValue<T extends ExprVal>(
  value: any,
  toType: T | undefined,
  context: ExprContext,
): ExprValToActual<T> | null {
  if (!toType || !(toType in ExprTypes)) {
    throw new UnknownTargetType(context, toType ? toType : typeof toType);
  }

  const typeObj = ExprTypes[toType];

  if (typeObj.nullable && isLikeNull(value)) {
    return null;
  }

  const valueType = valueToExprValueType(value);
  if (!typeObj.accepts.includes(valueType)) {
    const supported = [...typeObj.accepts, ...(typeObj.nullable ? ['null'] : [])].join(', ');
    throw new UnknownSourceType(context, typeof value, supported);
  }

  return typeObj.impl.apply(context, [value]);
}

function defineFunc<Args extends readonly ExprVal[], Ret extends ExprVal>(
  def: FuncDef<Args, Ret>,
): FuncDef<Mutable<Args>, Ret> {
  return def;
}

const instanceContextKeys: { [key in keyof IInstanceContext]: true } = {
  instanceId: true,
  appId: true,
  instanceOwnerPartyId: true,
  instanceOwnerPartyType: true,
};

const authContextKeys: { [key in keyof IAuthContext]: true } = {
  read: true,
  write: true,
  instantiate: true,
  confirm: true,
  sign: true,
  reject: true,
};

/**
 * All the functions available to execute inside expressions
 */
export const ExprFunctions = {
  argv: defineFunc({
    impl(idx) {
      if (!this.positionalArguments?.length) {
        throw new ExprRuntimeError(this, 'No positional arguments available');
      }

      if (typeof idx !== 'number' || idx < 0 || idx >= this.positionalArguments.length) {
        throw new ExprRuntimeError(this, 'Invalid argv index');
      }

      return this.positionalArguments[idx];
    },
    args: [ExprVal.Number] as const,
    returns: ExprVal.Any,
  }),
  equals: defineFunc({
    impl: (arg1, arg2) => arg1 === arg2,
    args: [ExprVal.String, ExprVal.String] as const,
    returns: ExprVal.Boolean,
  }),
  notEquals: defineFunc({
    impl: (arg1, arg2) => arg1 !== arg2,
    args: [ExprVal.String, ExprVal.String] as const,
    returns: ExprVal.Boolean,
  }),
  not: defineFunc({
    impl: (arg) => !arg,
    args: [ExprVal.Boolean] as const,
    returns: ExprVal.Boolean,
  }),
  greaterThan: defineFunc({
    impl: (arg1, arg2) => {
      if (arg1 === null || arg2 === null) {
        return false;
      }

      return arg1 > arg2;
    },
    args: [ExprVal.Number, ExprVal.Number] as const,
    returns: ExprVal.Boolean,
  }),
  greaterThanEq: defineFunc({
    impl: (arg1, arg2) => {
      if (arg1 === null || arg2 === null) {
        return false;
      }

      return arg1 >= arg2;
    },
    args: [ExprVal.Number, ExprVal.Number] as const,
    returns: ExprVal.Boolean,
  }),
  lessThan: defineFunc({
    impl: (arg1, arg2) => {
      if (arg1 === null || arg2 === null) {
        return false;
      }

      return arg1 < arg2;
    },
    args: [ExprVal.Number, ExprVal.Number] as const,
    returns: ExprVal.Boolean,
  }),
  lessThanEq: defineFunc({
    impl: (arg1, arg2) => {
      if (arg1 === null || arg2 === null) {
        return false;
      }

      return arg1 <= arg2;
    },
    args: [ExprVal.Number, ExprVal.Number] as const,
    returns: ExprVal.Boolean,
  }),
  concat: defineFunc({
    impl: (...args) => args.join(''),
    args: [ExprVal.String],
    minArguments: 0,
    returns: ExprVal.String,
    lastArgSpreads: true,
  }),
  and: defineFunc({
    impl: (...args) => args.reduce((prev, cur) => prev && !!cur, true),
    args: [ExprVal.Boolean],
    returns: ExprVal.Boolean,
    lastArgSpreads: true,
  }),
  or: defineFunc({
    impl: (...args) => args.reduce((prev, cur) => prev || !!cur, false),
    args: [ExprVal.Boolean],
    returns: ExprVal.Boolean,
    lastArgSpreads: true,
  }),
  if: defineFunc({
    impl(...args): any {
      const [condition, result] = args;
      if (condition === true) {
        return result;
      }

      return args.length === 4 ? args[3] : null;
    },
    validator: ({ rawArgs, ctx, path }) => {
      if (rawArgs.length === 2) {
        return;
      }
      if (rawArgs.length > 2 && rawArgs[2] !== 'else') {
        addError(ctx, [...path, '[2]'], 'Expected third argument to be "else"');
      }
      if (rawArgs.length === 4) {
        return;
      }
      addError(ctx, path, 'Expected either 2 arguments (if) or 4 (if + else), got %s', `${rawArgs.length}`);
    },
    args: [ExprVal.Boolean, ExprVal.Any, ExprVal.String, ExprVal.Any],
    returns: ExprVal.Any,
  }),
  instanceContext: defineFunc({
    impl(key): string | null {
      if (key === null || instanceContextKeys[key] !== true) {
        throw new ExprRuntimeError(this, `Unknown Instance context property ${key}`);
      }

      return (this.dataSources.instanceContext && this.dataSources.instanceContext[key]) || null;
    },
    args: [ExprVal.String] as const,
    returns: ExprVal.String,
  }),
  frontendSettings: defineFunc({
    impl(key): any {
      if (key === null) {
        throw new ExprRuntimeError(this, `Value cannot be null. (Parameter 'key')`);
      }

      return (this.dataSources.applicationSettings && this.dataSources.applicationSettings[key]) || null;
    },
    args: [ExprVal.String] as const,
    returns: ExprVal.Any,
  }),
  authContext: defineFunc({
    impl(key): boolean | null {
      if (key === null || authContextKeys[key] !== true) {
        throw new ExprRuntimeError(this, `Unknown auth context property ${key}`);
      }

      return Boolean(this.dataSources.authContext?.[key]);
    },
    args: [ExprVal.String] as const,
    returns: ExprVal.Boolean,
  }),
  component: defineFunc({
    impl(id): any {
      if (id === null) {
        throw new ExprRuntimeError(this, `Cannot lookup component null`);
      }

      const node = this.failWithoutNode();
      const closestComponent = node.closest((c) => c.id === id || c.baseComponentId === id);
      const component = closestComponent ?? (node instanceof LayoutPage ? node.findById(id) : node.top.findById(id));
      const dataModelBindings =
        component && 'dataModelBindings' in component.item ? component.item.dataModelBindings : undefined;
      const simpleBinding =
        dataModelBindings && 'simpleBinding' in dataModelBindings ? dataModelBindings.simpleBinding : undefined;
      if (component && simpleBinding) {
        if (component.isHidden()) {
          return null;
        }

        return (this.dataSources.formData && this.dataSources.formData[simpleBinding]) || null;
      }

      // Expressions can technically be used without having all the layouts available, which might lead to unexpected
      // results. We should note this in the error message, so we know the reason we couldn't find the component.
      const hasAllLayouts = node instanceof LayoutPage ? !!node.top : !!node.top.top;
      throw new ExprRuntimeError(
        this,
        hasAllLayouts
          ? `Unable to find component with identifier ${id} or it does not have a simpleBinding`
          : `Unable to find component with identifier ${id} in the current layout or it does not have a simpleBinding`,
      );
    },
    args: [ExprVal.String] as const,
    returns: ExprVal.Any,
  }),
  dataModel: defineFunc({
    impl(path): any {
      if (path === null) {
        throw new ExprRuntimeError(this, `Cannot lookup dataModel null`);
      }

      const maybeNode = this.failWithoutNode();
      if (maybeNode instanceof BaseLayoutNode) {
        const newPath = maybeNode?.transposeDataModel(path);
        return (newPath && this.dataSources.formData[newPath]) || null;
      }

      // No need to transpose the data model according to the location inside a repeating group when the context is
      // a LayoutPage (i.e., when we're resolving an expression directly on the layout definition).
      return this.dataSources.formData[path] || null;
    },
    args: [ExprVal.String] as const,
    returns: ExprVal.Any,
  }),
  displayValue: defineFunc({
    impl(id): any {
      if (id === null) {
        throw new ExprRuntimeError(this, `Cannot lookup component null`);
      }

      const node = this.failWithoutNode();
      const closestComponent = node.closest((c) => c.id === id || c.baseComponentId === id);
      const component = closestComponent ?? (node instanceof LayoutPage ? node.findById(id) : node.top.findById(id));

      if (!component) {
        throw new ExprRuntimeError(this, `Unable to find component with identifier ${id}`);
      }

      if (!implementsDisplayData(component.def)) {
        throw new ExprRuntimeError(this, `Component with identifier ${id} does not have a displayValue`);
      }

      if (component.isHidden()) {
        return null;
      }

      return component.def.getDisplayData(component as any, {
        formData: this.dataSources.formData,
        attachments: this.dataSources.attachments,
        options: this.dataSources.options,
        langTools: this.dataSources.langTools,
      });
    },
    args: [ExprVal.String] as const,
    returns: ExprVal.String,
  }),

  round: defineFunc({
    impl(number, decimalPoints) {
      const realNumber = number === null ? 0 : number;
      const realDecimalPoints = decimalPoints === null ? 0 : decimalPoints;
      return parseFloat(`${realNumber}`).toFixed(realDecimalPoints);
    },
    args: [ExprVal.Number, ExprVal.Number] as const,
    minArguments: 1,
    returns: ExprVal.String,
  }),
  text: defineFunc({
    impl(key) {
      if (key === null) {
        return null;
      }

      return this.dataSources.langTools.langAsString(key);
    },
    args: [ExprVal.String] as const,
    returns: ExprVal.String,
  }),
  language: defineFunc({
    impl() {
      return this.dataSources.langTools.selectedLanguage;
    },
    args: [] as const,
    returns: ExprVal.String,
  }),
  contains: defineFunc({
    impl(string, stringToContain): boolean {
      if (string === null || stringToContain === null) {
        return false;
      }

      return string.includes(stringToContain);
    },
    args: [ExprVal.String, ExprVal.String] as const,
    returns: ExprVal.Boolean,
  }),
  notContains: defineFunc({
    impl(string: string, stringToNotContain: string): boolean {
      if (string === null || stringToNotContain === null) {
        return true;
      }
      return !string.includes(stringToNotContain);
    },
    args: [ExprVal.String, ExprVal.String] as const,
    returns: ExprVal.Boolean,
  }),
  endsWith: defineFunc({
    impl(string: string, stringToMatch: string): boolean {
      if (string === null || stringToMatch === null) {
        return false;
      }
      return string.endsWith(stringToMatch);
    },
    args: [ExprVal.String, ExprVal.String] as const,
    returns: ExprVal.Boolean,
  }),
  startsWith: defineFunc({
    impl(string: string, stringToMatch: string): boolean {
      if (string === null || stringToMatch === null) {
        return false;
      }
      return string.startsWith(stringToMatch);
    },
    args: [ExprVal.String, ExprVal.String] as const,
    returns: ExprVal.Boolean,
  }),
  stringLength: defineFunc({
    impl: (string) => (string === null ? 0 : string.length),
    args: [ExprVal.String] as const,
    returns: ExprVal.Number,
  }),
  commaContains: defineFunc({
    impl(commaSeparatedString, stringToMatch) {
      if (commaSeparatedString === null || stringToMatch === null) {
        return false;
      }

      // Split the comma separated string into an array and remove whitespace from each part
      const parsedToArray = commaSeparatedString.split(',').map((part) => part.trim());
      return parsedToArray.includes(stringToMatch);
    },
    args: [ExprVal.String, ExprVal.String] as const,
    returns: ExprVal.Boolean,
  }),
  lowerCase: defineFunc({
    impl(string) {
      if (string === null) {
        return null;
      }
      return string.toLowerCase();
    },
    args: [ExprVal.String] as const,
    returns: ExprVal.String,
  }),
  upperCase: defineFunc({
    impl(string) {
      if (string === null) {
        return null;
      }
      return string.toUpperCase();
    },
    args: [ExprVal.String] as const,
    returns: ExprVal.String,
  }),
};

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
 * @see castValue
 */
export const ExprTypes: {
  [Type in ExprVal]: {
    nullable: boolean;
    accepts: ExprVal[];
    impl: (this: ExprContext, arg: any) => ExprValToActual<Type> | null;
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

      throw new UnexpectedType(this, 'boolean', arg);
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

      throw new UnexpectedType(this, 'number', arg);
    },
  },
  [ExprVal.Any]: {
    nullable: true,
    accepts: [ExprVal.Boolean, ExprVal.String, ExprVal.Number, ExprVal.Any],
    impl: (arg) => arg,
  },
};

/**
 * This function is attached globally, to aid in expression development. An app developer can use this function
 * to try out a given expression (even in the context of a given component ID), and see the result directly in
 * the browser console window.
 *
 * @deprecated This has been replaced by the developer tools, and should not be used anymore. It throws an error, but
 * after a while we can probably remove it entirely.
 */
window.evalExpression = () => {
  throw new Error(
    'evalExpression() utgår. Du kan nå evaluere og teste uttrykk i utviklerverktøyene i stedet. Trykk Ctrl+Shift+K ' +
      'for å åpne utviklerverktøyene, og naviger til fanen som heter "Uttrykk".',
  );
};

export const ExprConfigForComponent: ExprObjConfig<CompExternal> = {
  readOnly: {
    returnType: ExprVal.Boolean,
    defaultValue: false,
    resolvePerRow: false,
  },
  required: {
    returnType: ExprVal.Boolean,
    defaultValue: false,
    resolvePerRow: false,
  },
  hidden: {
    returnType: ExprVal.Boolean,
    defaultValue: false,
    resolvePerRow: false,
  },
  textResourceBindings: {
    [CONFIG_FOR_ALL_VALUES_IN_OBJ]: {
      returnType: ExprVal.String,
      defaultValue: '',
      resolvePerRow: false,
    },
  },
  pageBreak: {
    breakBefore: {
      returnType: ExprVal.String,
      defaultValue: 'auto',
      resolvePerRow: false,
    },
    breakAfter: {
      returnType: ExprVal.String,
      defaultValue: 'auto',
      resolvePerRow: false,
    },
  },
  alertOnDelete: {
    returnType: ExprVal.Boolean,
    defaultValue: false,
    resolvePerRow: false,
  },
  alertOnChange: {
    returnType: ExprVal.Boolean,
    defaultValue: false,
    resolvePerRow: false,
  },
};

export const ExprConfigForGroup: ExprObjConfig<CompGroupExternal> = {
  ...ExprConfigForComponent,
  hiddenRow: {
    returnType: ExprVal.Boolean,
    defaultValue: false,
    resolvePerRow: true,
  },
  textResourceBindings: {
    [CONFIG_FOR_ALL_VALUES_IN_OBJ]: {
      returnType: ExprVal.String,
      defaultValue: '',
      resolvePerRow: false,
    },
    save_and_next_button: {
      returnType: ExprVal.String,
      defaultValue: '',
      resolvePerRow: true,
    },
    save_button: {
      returnType: ExprVal.String,
      defaultValue: '',
      resolvePerRow: true,
    },
    edit_button_close: {
      returnType: ExprVal.String,
      defaultValue: '',
      resolvePerRow: true,
    },
    edit_button_open: {
      returnType: ExprVal.String,
      defaultValue: '',
      resolvePerRow: true,
    },
  },
  edit: {
    addButton: {
      returnType: ExprVal.Boolean,
      defaultValue: true,
      resolvePerRow: false,
    },
    deleteButton: {
      returnType: ExprVal.Boolean,
      defaultValue: true,
      resolvePerRow: true,
    },
    saveButton: {
      returnType: ExprVal.Boolean,
      defaultValue: true,
      resolvePerRow: true,
    },
    editButton: {
      returnType: ExprVal.Boolean,
      defaultValue: true,
      resolvePerRow: true,
    },
    alertOnDelete: {
      returnType: ExprVal.Boolean,
      defaultValue: false,
      resolvePerRow: true,
    },
    saveAndNextButton: {
      returnType: ExprVal.Boolean,
      defaultValue: false,
      resolvePerRow: true,
    },
  },
};
