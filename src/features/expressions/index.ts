import dot from 'dot-object';
import type { Mutable } from 'utility-types';

import {
  ExprRuntimeError,
  LookupNotFound,
  NodeNotFoundWithoutContext,
  UnexpectedType,
  UnknownSourceType,
  UnknownTargetType,
} from 'src/features/expressions/errors';
import { ExprContext } from 'src/features/expressions/ExprContext';
import { addError, asExpression, canBeExpression } from 'src/features/expressions/validation';
import { dataSourcesFromState, LayoutNode, LayoutRootNode, nodesInLayouts } from 'src/utils/layout/hierarchy';
import type { ContextDataSources } from 'src/features/expressions/ExprContext';
import type {
  BaseToActual,
  BaseValue,
  ExprDefaultValues,
  Expression,
  ExprFunction,
  ExprResolved,
  FuncDef,
} from 'src/features/expressions/types';
import type { ILayoutGroup } from 'src/layout/Group/types';
import type { ILayoutComponent } from 'src/layout/layout';
import type { IAltinnWindow } from 'src/types';
import type { IInstanceContext } from 'src/types/shared';

export interface EvalExprOptions {
  defaultValue?: any;
  errorIntroText?: string;
}

export interface EvalExprInObjArgs<T> {
  input: T;
  node: LayoutNode<any> | NodeNotFoundWithoutContext;
  dataSources: ContextDataSources;
  defaults?: ExprDefaultValues<T>;
}

/**
 * Magic key used to indicate a default value for all possible values in an object
 */
export const DEFAULT_FOR_ALL_VALUES_IN_OBJ = '__default__';

/**
 * This function is the brains behind the useExpressions() hook, as it will find any expressions inside a deep
 * object and resolve them.
 * @see useExpressions
 */
export function evalExprInObj<T>(args: EvalExprInObjArgs<T>): ExprResolved<T> {
  if (!args.input) {
    return args.input as ExprResolved<T>;
  }

  return evalExprInObjectRecursive(args.input, args as Omit<EvalExprInObjArgs<T>, 'input'>, []);
}

function getDefaultValueFor(path: string[], defaults: any) {
  const pathString = path.join('.');
  const pathStringAnyDefault = [...path.slice(0, path.length - 1), DEFAULT_FOR_ALL_VALUES_IN_OBJ].join('.');
  const defaultValueSpecific = dot.pick(pathString, defaults);
  const defaultValueGeneric = dot.pick(pathStringAnyDefault, defaults);

  if (typeof defaultValueSpecific !== 'undefined') {
    return defaultValueSpecific;
  }

  return defaultValueGeneric;
}

/**
 * Recurse through an input object/array/any, finds expressions and evaluates them
 */
function evalExprInObjectRecursive<T>(input: any, args: Omit<EvalExprInObjArgs<T>, 'input'>, path: string[]) {
  if (typeof input !== 'object' || input === null) {
    return input;
  }

  if (Array.isArray(input)) {
    let evaluateAsExpression = false;
    if (args.defaults) {
      evaluateAsExpression = typeof getDefaultValueFor(path, args.defaults) !== 'undefined';
    } else if (canBeExpression(input)) {
      evaluateAsExpression = true;
    }

    if (evaluateAsExpression) {
      const expression = asExpression(input);
      if (expression) {
        return evalExprInObjectCaller(expression, args, path);
      }
    }

    const newPath = [...path];
    const lastLeg = newPath.pop() || '';
    return input.map((item, idx) => evalExprInObjectRecursive(item, args, [...newPath, `${lastLeg}[${idx}]`]));
  }

  const out = {};
  for (const key of Object.keys(input)) {
    out[key] = evalExprInObjectRecursive(input[key], args, [...path, key]);
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
    errorIntroText: `Evaluated expression for '${pathString}' in component '${nodeId}'`,
  };

  if (args.defaults) {
    const defaultValue = getDefaultValueFor(path, args.defaults);
    if (typeof defaultValue !== 'undefined') {
      exprOptions.defaultValue = defaultValue;
    }
  }

  return evalExpr(expr, args.node, args.dataSources, exprOptions);
}

/**
 * Run/evaluate an expression. You have to provide your own context containing functions for looking up external
 * values. If you need a more concrete implementation:
 * @see evalExprInObj
 * @see useExpressions
 */
export function evalExpr(
  expr: Expression,
  node: LayoutNode<any> | LayoutRootNode<any> | NodeNotFoundWithoutContext,
  dataSources: ContextDataSources,
  options?: EvalExprOptions,
) {
  let ctx = ExprContext.withBlankPath(expr, node, dataSources);
  try {
    const result = innerEvalExpr(ctx);
    if ((result === null || result === undefined) && options && 'defaultValue' in options) {
      return options.defaultValue;
    }

    if (options && 'defaultValue' in options && typeof options.defaultValue !== typeof result) {
      return castValue(result, typeof options.defaultValue as BaseValue, ctx);
    }

    return result;
  } catch (err) {
    if (err instanceof ExprRuntimeError) {
      ctx = err.context;
    } else {
      throw err;
    }
    if (options && 'defaultValue' in options) {
      // When we know of a default value, we can safely print it as an error to the console and safely recover
      ctx.trace(err, {
        defaultValue: options.defaultValue,
        ...(options.errorIntroText ? { introText: options.errorIntroText } : {}),
      });
      return options.defaultValue;
    } else {
      // We cannot possibly know the expected default value here, so there are no safe ways to fail here except
      // throwing the exception to let everyone know we failed.
      throw new Error(ctx.prettyError(err));
    }
  }
}

export function argTypeAt(func: ExprFunction, argIndex: number): BaseValue | undefined {
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

  const actualFunc: (...args: any) => any = ExprFunctions[func].impl;
  const returnValue = actualFunc.apply(context, computedArgs);

  return castValue(returnValue, returnType, context);
}

function valueToBaseValueType(value: any): BaseValue | string {
  if (typeof value === 'number' || typeof value === 'bigint') {
    return 'number';
  }
  return typeof value;
}

function isLikeNull(arg: any) {
  return arg === 'null' || arg === null || typeof arg === 'undefined';
}

/**
 * This function is used to cast any value to a target type before/after it is passed
 * through a function call.
 */
function castValue<T extends BaseValue>(
  value: any,
  toType: T | undefined,
  context: ExprContext,
): BaseToActual<T> | null {
  if (!toType || !(toType in ExprTypes)) {
    throw new UnknownTargetType(this, toType ? toType : typeof toType);
  }

  const typeObj = ExprTypes[toType];

  if (typeObj.nullable && isLikeNull(value)) {
    return null;
  }

  const valueBaseType = valueToBaseValueType(value) as BaseValue;
  if (!typeObj.accepts.includes(valueBaseType)) {
    const supported = [...typeObj.accepts, ...(typeObj.nullable ? ['null'] : [])].join(', ');
    throw new UnknownSourceType(this, typeof value, supported);
  }

  return typeObj.impl.apply(context, [value]);
}

function defineFunc<Args extends readonly BaseValue[], Ret extends BaseValue>(
  def: FuncDef<Args, Ret>,
): FuncDef<Mutable<Args>, Ret> {
  return def;
}

const instanceContextKeys: { [key in keyof IInstanceContext]: true } = {
  instanceId: true,
  appId: true,
  instanceOwnerPartyId: true,
};

/**
 * All the functions available to execute inside expressions
 */
export const ExprFunctions = {
  equals: defineFunc({
    impl: (arg1, arg2) => arg1 === arg2,
    args: ['string', 'string'] as const,
    returns: 'boolean',
  }),
  notEquals: defineFunc({
    impl: (arg1, arg2) => arg1 !== arg2,
    args: ['string', 'string'] as const,
    returns: 'boolean',
  }),
  not: defineFunc({
    impl: (arg) => !arg,
    args: ['boolean'] as const,
    returns: 'boolean',
  }),
  greaterThan: defineFunc({
    impl: (arg1, arg2) => {
      if (arg1 === null || arg2 === null) {
        return false;
      }

      return arg1 > arg2;
    },
    args: ['number', 'number'] as const,
    returns: 'boolean',
  }),
  greaterThanEq: defineFunc({
    impl: (arg1, arg2) => {
      if (arg1 === null || arg2 === null) {
        return false;
      }

      return arg1 >= arg2;
    },
    args: ['number', 'number'] as const,
    returns: 'boolean',
  }),
  lessThan: defineFunc({
    impl: (arg1, arg2) => {
      if (arg1 === null || arg2 === null) {
        return false;
      }

      return arg1 < arg2;
    },
    args: ['number', 'number'] as const,
    returns: 'boolean',
  }),
  lessThanEq: defineFunc({
    impl: (arg1, arg2) => {
      if (arg1 === null || arg2 === null) {
        return false;
      }

      return arg1 <= arg2;
    },
    args: ['number', 'number'] as const,
    returns: 'boolean',
  }),
  concat: defineFunc({
    impl: (...args) => args.join(''),
    args: ['string'],
    minArguments: 0,
    returns: 'string',
    lastArgSpreads: true,
  }),
  and: defineFunc({
    impl: (...args) => args.reduce((prev, cur) => prev && !!cur, true),
    args: ['boolean'],
    returns: 'boolean',
    lastArgSpreads: true,
  }),
  or: defineFunc({
    impl: (...args) => args.reduce((prev, cur) => prev || !!cur, false),
    args: ['boolean'],
    returns: 'boolean',
    lastArgSpreads: true,
  }),
  if: defineFunc({
    impl: function (...args): any {
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
    args: ['boolean', 'any', 'string', 'any'],
    returns: 'any',
  }),
  instanceContext: defineFunc({
    impl: function (key): string | null {
      if (key === null || instanceContextKeys[key] !== true) {
        throw new LookupNotFound(this, `Unknown Instance context property ${key}`);
      }

      return (this.dataSources.instanceContext && this.dataSources.instanceContext[key]) || null;
    },
    args: ['string'] as const,
    returns: 'string',
  }),
  frontendSettings: defineFunc({
    impl: function (key): any {
      if (key === null) {
        throw new LookupNotFound(this, `Value cannot be null. (Parameter 'key')`);
      }

      return (this.dataSources.applicationSettings && this.dataSources.applicationSettings[key]) || null;
    },
    args: ['string'] as const,
    returns: 'any',
  }),
  component: defineFunc({
    impl: function (id): any {
      if (id === null) {
        throw new LookupNotFound(this, `Cannot lookup component null`);
      }

      const node = this.failWithoutNode();
      const component = node.closest((c) => c.id === id || c.baseComponentId === id);
      const binding = component?.item?.dataModelBindings?.simpleBinding;
      if (component && binding) {
        if (component.isHidden(this.dataSources.hiddenFields)) {
          return null;
        }

        return (this.dataSources.formData && this.dataSources.formData[binding]) || null;
      }

      // Expressions can technically be used without having all the layouts available, which might lead to unexpected
      // results. We should note this in the error message, so we know the reason we couldn't find the component.
      const hasAllLayouts = node instanceof LayoutRootNode ? !!node.top : !!node.top.top;
      throw new LookupNotFound(
        this,
        hasAllLayouts
          ? `Unable to find component with identifier ${id} or it does not have a simpleBinding`
          : `Unable to find component with identifier ${id} in the current layout or it does not have a simpleBinding`,
      );
    },
    args: ['string'] as const,
    returns: 'any',
  }),
  dataModel: defineFunc({
    impl: function (path): any {
      if (path === null) {
        throw new LookupNotFound(this, `Cannot lookup dataModel null`);
      }

      const maybeNode = this.failWithoutNode();
      if (maybeNode instanceof LayoutNode) {
        const newPath = maybeNode?.transposeDataModel(path);
        return (newPath && this.dataSources.formData[newPath]) || null;
      }

      // No need to transpose the data model according to the location inside a repeating group when the context is
      // a LayoutRootNode (i.e., when we're resolving an expression directly on the layout definition).
      return this.dataSources.formData[path] || null;
    },
    args: ['string'] as const,
    returns: 'any',
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
  [Type in BaseValue]: {
    nullable: boolean;
    accepts: BaseValue[];
    impl: (this: ExprContext, arg: any) => BaseToActual<Type> | null;
  };
} = {
  boolean: {
    nullable: true,
    accepts: ['boolean', 'string', 'number', 'any'],
    impl: function (arg) {
      if (typeof arg === 'boolean') {
        return arg;
      }
      if (arg === 'true') return true;
      if (arg === 'false') return false;

      if (typeof arg === 'string' || typeof arg === 'number' || typeof arg === 'bigint') {
        const num = typeof arg === 'string' ? asNumber(arg) : arg;
        if (num !== undefined) {
          if (num === 1) return true;
          if (num === 0) return false;
        }
      }

      throw new UnexpectedType(this, 'boolean', arg);
    },
  },
  string: {
    nullable: true,
    accepts: ['boolean', 'string', 'number', 'any'],
    impl: function (arg) {
      if (['number', 'bigint', 'boolean'].includes(typeof arg)) {
        return JSON.stringify(arg);
      }

      // Always lowercase these values, to make comparisons case-insensitive
      if (arg.toLowerCase() === 'null') return null;
      if (arg.toLowerCase() === 'false') return 'false';
      if (arg.toLowerCase() === 'true') return 'true';

      return `${arg}`;
    },
  },
  number: {
    nullable: true,
    accepts: ['boolean', 'string', 'number', 'any'],
    impl: function (arg) {
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
  any: {
    nullable: true,
    accepts: ['boolean', 'string', 'number'],
    impl: (arg) => arg,
  },
};

/**
 * This function is attached globally, to aid in expression development. An app developer can use this function
 * to try out a given expression (even in the context of a given component ID), and see the result directly in
 * the browser console window.
 *
 * @deprecated DO NOT use this directly, it is only meant for app developers to test out their expressions. It is not
 * meant to be performant, and will never get optimized in any way. In addition, it will spit out nice errors in the
 * console for app developers to understand. Use other alternatives in your code instead.
 *
 * @see useExpressions
 * @see useExpressionsForComponent
 * @see resolvedNodesInLayouts
 */
(window as unknown as IAltinnWindow).evalExpression = (maybeExpression: any, forComponentId?: string) => {
  const expr = asExpression(maybeExpression, null);
  if (!expr) {
    return null;
  }

  const state = (window as unknown as IAltinnWindow).reduxStore.getState();
  const nodes = nodesInLayouts(
    state.formLayout.layouts,
    state.formLayout.uiConfig.currentView,
    state.formLayout.uiConfig.repeatingGroups,
  );
  let context: LayoutRootNode | LayoutNode = nodes.findLayout(state.formLayout.uiConfig.currentView);
  if (forComponentId) {
    const foundNode = nodes.findById(forComponentId);
    if (!foundNode) {
      console.error('Unable to find component with id', forComponentId);
      console.error(
        'Available components on the current page:',
        context.flat(true).map((c) => c.item.id),
      );
      return;
    }
    context = foundNode;
  }

  const dataSources = dataSourcesFromState(state);
  return evalExpr(expr as Expression, context, dataSources, { defaultValue: null });
};

export const ExprDefaultsForComponent: ExprDefaultValues<ILayoutComponent> = {
  readOnly: false,
  required: false,
  hidden: false,
  textResourceBindings: {
    [DEFAULT_FOR_ALL_VALUES_IN_OBJ]: '',
  },
  pageBreak: {
    breakBefore: false,
    breakAfter: false,
  },
};

export const ExprDefaultsForGroup: ExprDefaultValues<ILayoutGroup> = {
  ...ExprDefaultsForComponent,
  edit: {
    addButton: true,
    deleteButton: true,
    saveButton: true,
    alertOnDelete: false,
    saveAndNextButton: false,
  },
};
