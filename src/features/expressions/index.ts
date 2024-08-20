import type { Mutable } from 'utility-types';

import { ContextNotProvided } from 'src/core/contexts/context';
import {
  ExprRuntimeError,
  UnexpectedType,
  UnknownSourceType,
  UnknownTargetType,
} from 'src/features/expressions/errors';
import { ExprContext } from 'src/features/expressions/ExprContext';
import { ExprVal } from 'src/features/expressions/types';
import { addError } from 'src/features/expressions/validation';
import { SearchParams } from 'src/hooks/useNavigatePage';
import { implementsDisplayData } from 'src/layout';
import { isDate } from 'src/utils/dateHelpers';
import { formatDateLocale } from 'src/utils/formatDateLocale';
import { BaseLayoutNode } from 'src/utils/layout/LayoutNode';
import { LayoutPage } from 'src/utils/layout/LayoutPage';
import type { DisplayData } from 'src/features/displayData';
import type { NodeNotFoundWithoutContext } from 'src/features/expressions/errors';
import type { ExpressionDataSources } from 'src/features/expressions/ExprContext';
import type {
  ExprConfig,
  Expression,
  ExprFunction,
  ExprPositionalArgs,
  ExprValToActual,
  ExprValToActualOrExpr,
  FuncDef,
} from 'src/features/expressions/types';
import type { FormDataSelector } from 'src/layout';
import type { IAuthContext, IInstanceDataSources } from 'src/types/shared';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export interface EvalExprOptions {
  config?: ExprConfig;
  errorIntroText?: string;
  onBeforeFunctionCall?: (path: string[], func: ExprFunction, args: any[]) => void;
  onAfterFunctionCall?: (path: string[], func: ExprFunction, args: any[], result: any) => void;
  positionalArguments?: ExprPositionalArgs;
}

export type SimpleEval<T extends ExprVal> = (
  expr: ExprValToActualOrExpr<T> | undefined,
  defaultValue: ExprValToActual<T>,
  dataSources?: Partial<ExpressionDataSources>,
) => ExprValToActual<T>;

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
    Object.keys(ExprFunctions).includes(input[0])
  );
}

/**
 * Run/evaluate an expression. You have to provide your own context containing functions for looking up external values.
 */
export function evalExpr(
  expr: Expression | ExprValToActual | undefined,
  node: LayoutNode | LayoutPage | NodeNotFoundWithoutContext,
  dataSources: ExpressionDataSources,
  options?: EvalExprOptions,
) {
  if (!isExpression(expr)) {
    return expr;
  }
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

const instanceDataSourcesKeys: { [key in keyof IInstanceDataSources]: true } = {
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

function pickSimpleValue(path: string | undefined | null, selector: FormDataSelector) {
  if (!path) {
    return null;
  }

  const value = selector(path);
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  return null;
}

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
      if (key === null || instanceDataSourcesKeys[key] !== true) {
        throw new ExprRuntimeError(this, `Unknown Instance context property ${key}`);
      }

      return (this.dataSources.instanceDataSources && this.dataSources.instanceDataSources[key]) || null;
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
      const closest = this.dataSources.nodeTraversal(
        (t) =>
          t.with(node).closest((c) => c.type === 'node' && (c.layout.id === id || c.layout.baseComponentId === id)),
        [node, id],
      );

      if (closest === ContextNotProvided) {
        // Expressions will run before the layout is fully loaded, so we might not have all the components available
        // yet. If that's the case, silently ignore this expression.
        return null;
      }

      const dataModelBindings = closest
        ? this.dataSources.nodeDataSelector((picker) => picker(closest)?.layout.dataModelBindings, [closest])
        : undefined;

      const simpleBinding =
        dataModelBindings && 'simpleBinding' in dataModelBindings ? dataModelBindings.simpleBinding : undefined;
      if (closest && simpleBinding) {
        if (this.dataSources.isHiddenSelector(closest)) {
          return null;
        }

        return pickSimpleValue(simpleBinding, this.dataSources.formDataSelector);
      }

      // Expressions can technically be used without having all the layouts available, which might lead to unexpected
      // results. We should note this in the error message, so we know the reason we couldn't find the component.
      const hasAllLayouts = node instanceof LayoutPage ? !!node.layoutSet : !!node.page.layoutSet;
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
        const newPath = this.dataSources.transposeSelector(maybeNode as LayoutNode, path);
        return pickSimpleValue(newPath, this.dataSources.formDataSelector);
      }

      // No need to transpose the data model according to the location inside a repeating group when the context is
      // a LayoutPage (i.e., when we're resolving an expression directly on the layout definition).
      return pickSimpleValue(path, this.dataSources.formDataSelector);
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
      const targetNode = this.dataSources.nodeTraversal(
        (t) => t.with(node).closest((c) => c.type === 'node' && (c.item?.id === id || c.item?.baseComponentId === id)),
        [node, id],
      );

      if (targetNode === ContextNotProvided) {
        // Expressions will run before the layout is fully loaded, so we might not have all the components available
        // yet. If that's the case, silently ignore this expression.
        return null;
      }

      if (!targetNode) {
        throw new ExprRuntimeError(this, `Unable to find component with identifier ${id}`);
      }

      const def = targetNode.def;
      if (!implementsDisplayData(def)) {
        throw new ExprRuntimeError(this, `Component with identifier ${id} does not have a displayValue`);
      }

      if (this.dataSources.isHiddenSelector(targetNode)) {
        return null;
      }

      return (def as DisplayData<any>).getDisplayData(targetNode, {
        attachmentsSelector: this.dataSources.attachmentsSelector,
        optionsSelector: this.dataSources.optionsSelector,
        langTools: this.dataSources.langToolsSelector(node as LayoutNode),
        currentLanguage: this.dataSources.currentLanguage,
        formDataSelector: this.dataSources.formDataSelector,
        nodeFormDataSelector: this.dataSources.nodeFormDataSelector,
        nodeDataSelector: this.dataSources.nodeDataSelector,
      });
    },
    args: [ExprVal.String] as const,
    returns: ExprVal.String,
  }),
  formatDate: defineFunc({
    impl(date: string, format: string | null): string | null {
      const selectedLanguage = this.dataSources.currentLanguage;
      if (!isDate(date)) {
        return null;
      }
      return formatDateLocale(selectedLanguage, new Date(date), format ?? undefined);
    },
    minArguments: 1,
    args: [ExprVal.String, ExprVal.String] as const,
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

      const node = this.node instanceof BaseLayoutNode ? this.node : undefined;
      return this.dataSources.langToolsSelector(node).langAsNonProcessedString(key);
    },
    args: [ExprVal.String] as const,
    returns: ExprVal.String,
  }),
  linkToComponent: defineFunc({
    impl(linkText, id) {
      if (id == null) {
        window.logWarn('Component id was empty but must be set for linkToComponent to work');
        return null;
      }
      if (linkText == null) {
        window.logWarn('Link text was empty but must be set for linkToComponent to work');
        return null;
      }

      const node = this.failWithoutNode();
      const closest = this.dataSources.nodeTraversal(
        (t) =>
          t.with(node).closest((c) => c.type === 'node' && (c.layout.id === id || c.layout.baseComponentId === id)),
        [node, id],
      );

      if (closest === ContextNotProvided) {
        // Expressions will run before the layout is fully loaded, so we might not have all the components available
        // yet. If that's the case, silently ignore this expression.
        return null;
      }

      if (!closest) {
        throw new ExprRuntimeError(this, `Unable to find component with identifier ${id}`);
      }

      const taskId = this.dataSources.process?.currentTask?.elementId;
      const instanceId = this.dataSources.instanceDataSources?.instanceId;

      let url = '';
      if (taskId && instanceId) {
        url = `/instance/${instanceId}/${taskId}/${closest.pageKey}`;
      } else {
        url = `/${closest.pageKey}`;
      }

      const searchParams = new URLSearchParams();
      searchParams.set(SearchParams.FocusComponentId, closest.id);
      const newUrl = `${url}?${searchParams.toString()}`;
      return `<a href="${newUrl}" data-link-type="LinkToPotentialNode">${linkText}</a>`;
    },
    args: [ExprVal.String, ExprVal.String] as const,
    minArguments: 2,
    returns: ExprVal.String,
  }),
  linkToPage: defineFunc({
    impl(linkText, pageId) {
      if (pageId == null) {
        window.logWarn('Page id was empty but must be set for linkToPage to work');
        return null;
      }
      if (linkText == null) {
        window.logWarn('Link text was empty but must be set for linkToPage to work');
        return null;
      }
      const taskId = this.dataSources.process?.currentTask?.elementId;
      const instanceId = this.dataSources.instanceDataSources?.instanceId;

      let url = '';
      if (taskId && instanceId) {
        url = `/instance/${instanceId}/${taskId}/${pageId}`;
      } else {
        url = `/${pageId}`;
      }
      return `<a href="${url}" data-link-type="LinkToPotentialPage">${linkText}</a>`;
    },
    args: [ExprVal.String, ExprVal.String] as const,
    minArguments: 2,
    returns: ExprVal.String,
  }),
  language: defineFunc({
    impl() {
      return this.dataSources.currentLanguage;
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
  _experimentalSelectAndMap: defineFunc({
    args: [ExprVal.String, ExprVal.String, ExprVal.String, ExprVal.String, ExprVal.Boolean] as const,
    impl(path, propertyToSelect, prepend, append, appendToLastElement = true) {
      if (path === null || propertyToSelect == null) {
        throw new ExprRuntimeError(this, `Cannot lookup dataModel null`);
      }
      const array = this.dataSources.formDataSelector(path);
      if (typeof array != 'object' || !Array.isArray(array)) {
        return '';
      }
      return array
        .map((x, i) => {
          const hideLastElement = i == array.length - 1 && !appendToLastElement;

          const valueToPrepend = prepend == null ? '' : prepend;
          const valueToAppend = append == null || hideLastElement ? '' : append;

          return `${valueToPrepend}${x[propertyToSelect]}${valueToAppend}`;
        })
        .join(' ');
    },
    minArguments: 2,
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
