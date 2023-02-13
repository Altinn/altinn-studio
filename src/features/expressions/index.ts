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
  ExprConfig,
  Expression,
  ExprFunction,
  ExprObjConfig,
  ExprResolved,
  FuncDef,
} from 'src/features/expressions/types';
import type { ILayoutGroup } from 'src/layout/Group/types';
import type { ILayoutComponent } from 'src/layout/layout';
import type { IAltinnWindow } from 'src/types';
import type { IInstanceContext } from 'src/types/shared';

export interface EvalExprOptions {
  config?: ExprConfig<BaseValue>;
  errorIntroText?: string;
}

export interface EvalExprInObjArgs<T> {
  input: T;
  node: LayoutNode<any> | NodeNotFoundWithoutContext;
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
  node: LayoutNode<any> | LayoutRootNode<any> | NodeNotFoundWithoutContext,
  dataSources: ContextDataSources,
  options?: EvalExprOptions,
) {
  let ctx = ExprContext.withBlankPath(expr, node, dataSources);
  try {
    const result = innerEvalExpr(ctx);
    if ((result === null || result === undefined) && options && options.config) {
      return options.config.defaultValue;
    }

    if (
      options &&
      options.config &&
      options.config.returnType !== 'any' &&
      options.config.returnType !== typeof result
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
    if (options && options.config) {
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
    throw new UnknownTargetType(context, toType ? toType : typeof toType);
  }

  const typeObj = ExprTypes[toType];

  if (typeObj.nullable && isLikeNull(value)) {
    return null;
  }

  const valueBaseType = valueToBaseValueType(value) as BaseValue;
  if (!typeObj.accepts.includes(valueBaseType)) {
    const supported = [...typeObj.accepts, ...(typeObj.nullable ? ['null'] : [])].join(', ');
    throw new UnknownSourceType(context, typeof value, supported);
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
  instanceOwnerPartyType: true,
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
 * @see resolvedNodesInLayouts
 */
(window as unknown as IAltinnWindow).evalExpression = (maybeExpression: any, forComponentId?: string) => {
  const config: ExprConfig<'any'> = {
    returnType: 'any',
    defaultValue: null,
    resolvePerRow: false,
  };

  const expr = asExpression(maybeExpression, config);
  if (!expr) {
    return null;
  }

  const state = (window as unknown as IAltinnWindow).reduxStore.getState();
  const currentLayout = state.formLayout.uiConfig.currentView;
  const nodes = nodesInLayouts(state.formLayout.layouts, currentLayout, state.formLayout.uiConfig.repeatingGroups);
  let layout: LayoutRootNode | LayoutNode | undefined = nodes.findLayout(currentLayout);
  if (!layout) {
    console.error('Unable to find current page/layout:', currentLayout);
    return;
  }

  if (forComponentId) {
    const foundNode = nodes.findById(forComponentId);
    if (!foundNode) {
      console.error('Unable to find component with id', forComponentId);
      console.error(
        'Available components on the current page:',
        layout?.flat(true).map((c) => c.item.id),
      );
      return;
    }
    layout = foundNode;
  }

  const dataSources = dataSourcesFromState(state);
  return evalExpr(expr as Expression, layout, dataSources, { config });
};

export const ExprConfigForComponent: ExprObjConfig<ILayoutComponent> = {
  readOnly: {
    returnType: 'boolean',
    defaultValue: false,
    resolvePerRow: false,
  },
  required: {
    returnType: 'boolean',
    defaultValue: false,
    resolvePerRow: false,
  },
  hidden: {
    returnType: 'boolean',
    defaultValue: false,
    resolvePerRow: false,
  },
  textResourceBindings: {
    [CONFIG_FOR_ALL_VALUES_IN_OBJ]: {
      returnType: 'string',
      defaultValue: '',
      resolvePerRow: false,
    },
  },
  pageBreak: {
    breakBefore: {
      returnType: 'string',
      defaultValue: 'auto',
      resolvePerRow: false,
    },
    breakAfter: {
      returnType: 'string',
      defaultValue: 'auto',
      resolvePerRow: false,
    },
  },
};

export const ExprConfigForGroup: ExprObjConfig<ILayoutGroup> = {
  ...ExprConfigForComponent,
  textResourceBindings: {
    ...ExprConfigForComponent.textResourceBindings,
    save_and_next_button: {
      returnType: 'string',
      defaultValue: '',
      resolvePerRow: true,
    },
    save_button: {
      returnType: 'string',
      defaultValue: '',
      resolvePerRow: true,
    },
    edit_button_close: {
      returnType: 'string',
      defaultValue: '',
      resolvePerRow: true,
    },
    edit_button_open: {
      returnType: 'string',
      defaultValue: '',
      resolvePerRow: true,
    },
  },
  edit: {
    addButton: {
      returnType: 'boolean',
      defaultValue: true,
      resolvePerRow: false,
    },
    deleteButton: {
      returnType: 'boolean',
      defaultValue: true,
      resolvePerRow: true,
    },
    saveButton: {
      returnType: 'boolean',
      defaultValue: true,
      resolvePerRow: true,
    },
    alertOnDelete: {
      returnType: 'boolean',
      defaultValue: false,
      resolvePerRow: true,
    },
    saveAndNextButton: {
      returnType: 'boolean',
      defaultValue: false,
      resolvePerRow: true,
    },
  },
};
