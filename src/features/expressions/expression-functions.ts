import dot from 'dot-object';
import type { Mutable } from 'utility-types';

import { ContextNotProvided } from 'src/core/contexts/context';
import { ExprRuntimeError, NodeNotFound, NodeNotFoundWithoutContext } from 'src/features/expressions/errors';
import { ExprVal } from 'src/features/expressions/types';
import { addError } from 'src/features/expressions/validation';
import { SearchParams } from 'src/hooks/useNavigatePage';
import { implementsDisplayData } from 'src/layout';
import { buildAuthContext } from 'src/utils/authContext';
import { isDate } from 'src/utils/dateHelpers';
import { formatDateLocale } from 'src/utils/formatDateLocale';
import { BaseLayoutNode } from 'src/utils/layout/LayoutNode';
import { LayoutPage } from 'src/utils/layout/LayoutPage';
import type { DisplayData } from 'src/features/displayData';
import type { EvaluateExpressionParams } from 'src/features/expressions';
import type { ExprValToActual } from 'src/features/expressions/types';
import type { ValidationContext } from 'src/features/expressions/validation';
import type { FormDataSelector } from 'src/layout';
import type { IAuthContext, IInstanceDataSources } from 'src/types/shared';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

type ArgsToActualOrNull<T extends readonly ExprVal[]> = {
  [Index in keyof T]: ExprValToActual<T[Index]> | null;
};

export interface FuncDef<Args extends readonly ExprVal[], Ret extends ExprVal> {
  impl: (this: EvaluateExpressionParams, ...params: ArgsToActualOrNull<Args>) => ExprValToActual<Ret> | null;
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rawArgs: any[];
    argTypes: (ExprVal | undefined)[];
    ctx: ValidationContext;
    path: string[];
  }) => void;
}

function defineFunc<Args extends readonly ExprVal[], Ret extends ExprVal>(
  def: FuncDef<Args, Ret>,
): FuncDef<Mutable<Args>, Ret> {
  return def;
}

/**
 * All the functions available to execute inside expressions
 */
export const ExprFunctions = {
  argv: defineFunc({
    impl(idx) {
      if (!this.positionalArguments?.length) {
        throw new ExprRuntimeError(this.expr, this.path, 'No positional arguments available');
      }

      if (typeof idx !== 'number' || idx < 0 || idx >= this.positionalArguments.length) {
        throw new ExprRuntimeError(this.expr, this.path, 'Invalid argv index');
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      const instanceDataSourcesKeys: { [key in keyof IInstanceDataSources]: true } = {
        instanceId: true,
        appId: true,
        instanceOwnerPartyId: true,
        instanceOwnerPartyType: true,
      };

      if (key === null || instanceDataSourcesKeys[key] !== true) {
        throw new ExprRuntimeError(this.expr, this.path, `Unknown Instance context property ${key}`);
      }

      return (this.dataSources.instanceDataSources && this.dataSources.instanceDataSources[key]) || null;
    },
    args: [ExprVal.String] as const,
    returns: ExprVal.String,
  }),
  frontendSettings: defineFunc({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    impl(key): any {
      if (key === null) {
        throw new ExprRuntimeError(this.expr, this.path, `Value cannot be null. (Parameter 'key')`);
      }

      return (this.dataSources.applicationSettings && this.dataSources.applicationSettings[key]) || null;
    },
    args: [ExprVal.String] as const,
    returns: ExprVal.Any,
  }),
  authContext: defineFunc({
    impl(key): boolean | null {
      const authContextKeys: { [key in keyof IAuthContext]: true } = {
        read: true,
        write: true,
        instantiate: true,
        confirm: true,
        sign: true,
        reject: true,
      };

      if (key === null || authContextKeys[key] !== true) {
        throw new ExprRuntimeError(this.expr, this.path, `Unknown auth context property ${key}`);
      }

      const authContext = buildAuthContext(this.dataSources.process?.currentTask);
      return Boolean(authContext?.[key]);
    },
    args: [ExprVal.String] as const,
    returns: ExprVal.Boolean,
  }),
  component: defineFunc({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    impl(id): any {
      if (id === null) {
        throw new ExprRuntimeError(this.expr, this.path, `Cannot lookup component null`);
      }

      const node = ensureNode(this.node);
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
        this.expr,
        this.path,
        hasAllLayouts
          ? `Unable to find component with identifier ${id} or it does not have a simpleBinding`
          : `Unable to find component with identifier ${id} in the current layout or it does not have a simpleBinding`,
      );
    },
    args: [ExprVal.String] as const,
    returns: ExprVal.Any,
  }),
  dataModel: defineFunc({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    impl(path): any {
      if (path === null) {
        throw new ExprRuntimeError(this.expr, this.path, `Cannot lookup dataModel null`);
      }

      const node = ensureNode(this.node);
      if (node instanceof BaseLayoutNode) {
        const newPath = this.dataSources.transposeSelector(node as LayoutNode, path);
        return pickSimpleValue(newPath, this.dataSources.formDataSelector);
      }

      // No need to transpose the data model according to the location inside a repeating group when the context is
      // a LayoutPage (i.e., when we're resolving an expression directly on the layout definition).
      return pickSimpleValue(path, this.dataSources.formDataSelector);
    },
    args: [ExprVal.String] as const,
    returns: ExprVal.Any,
  }),
  externalApi: defineFunc({
    impl(externalApiId, path): string | null {
      if (typeof externalApiId !== 'string' || typeof path !== 'string') {
        throw new ExprRuntimeError(this.expr, this.path, `Expected string arguments`);
      }

      const externalApiData: unknown = this.dataSources.externalApis.data[externalApiId];

      const res =
        path && externalApiData && typeof externalApiData === 'object'
          ? dot.pick(path, externalApiData)
          : externalApiData;

      if (!res || typeof res === 'object') {
        return null; // Print error?
      }

      return String(res);
    },
    args: [ExprVal.String, ExprVal.String] as const,
    validator: ({ rawArgs, ctx, path }) => {
      if (rawArgs.length !== 2) {
        addError(ctx, path, 'Expected exactly 2 arguments, got %s', `${rawArgs.length}`);
      }
    },
    returns: ExprVal.String,
  }),
  displayValue: defineFunc({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    impl(id): any {
      if (id === null) {
        throw new ExprRuntimeError(this.expr, this.path, `Cannot lookup component null`);
      }

      const node = ensureNode(this.node);
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
        throw new ExprRuntimeError(this.expr, this.path, `Unable to find component with identifier ${id}`);
      }

      const def = targetNode.def;
      if (!implementsDisplayData(def)) {
        throw new ExprRuntimeError(
          this.expr,
          this.path,
          `Component with identifier ${id} does not have a displayValue`,
        );
      }

      if (this.dataSources.isHiddenSelector(targetNode)) {
        return null;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

      const node = ensureNode(this.node);
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
        throw new ExprRuntimeError(this.expr, this.path, `Unable to find component with identifier ${id}`);
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
        throw new ExprRuntimeError(this.expr, this.path, `Cannot lookup dataModel null`);
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

export function ensureNode(
  node: LayoutNode | LayoutPage | BaseLayoutNode | NodeNotFoundWithoutContext,
): LayoutNode | BaseLayoutNode | LayoutPage {
  if (node instanceof NodeNotFoundWithoutContext) {
    throw new NodeNotFound(node.getId());
  }
  return node;
}
