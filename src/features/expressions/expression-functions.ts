import dot from 'dot-object';
import escapeStringRegexp from 'escape-string-regexp';

import { ContextNotProvided } from 'src/core/contexts/context';
import { exprCastValue } from 'src/features/expressions';
import { ExprRuntimeError, NodeRelationNotFound } from 'src/features/expressions/errors';
import { ExprVal } from 'src/features/expressions/types';
import { addError } from 'src/features/expressions/validation';
import { makeIndexedId } from 'src/features/form/layout/utils/makeIndexedId';
import { CodeListPending } from 'src/features/options/CodeListsProvider';
import { SearchParams } from 'src/features/routing/AppRoutingContext';
import { buildAuthContext } from 'src/utils/authContext';
import { transposeDataBinding } from 'src/utils/databindings/DataBinding';
import { formatDateLocale } from 'src/utils/dateUtils';
import type { EvaluateExpressionParams } from 'src/features/expressions';
import type {
  AnyExprArg,
  ExprArgDef,
  ExprDate,
  ExprFunctionName,
  ExprFunctions,
  ExprValToActual,
} from 'src/features/expressions/types';
import type { ValidationContext } from 'src/features/expressions/validation';
import type { IDataModelReference } from 'src/layout/common.generated';
import type { IAuthContext, IInstanceDataSources } from 'src/types/shared';
import type { ExpressionDataSources } from 'src/utils/layout/useExpressionDataSources';

type ArgsToActual<T extends readonly AnyExprArg[]> = {
  [Index in keyof T]: T[Index]['variant'] extends 'optional'
    ? ExprValToActual<T[Index]['type']> | null | undefined
    : ExprValToActual<T[Index]['type']> | null;
};

export type AnyFuncDef = FuncDef<readonly AnyExprArg[], ExprVal>;
export interface FuncDef<Args extends readonly AnyExprArg[], Ret extends ExprVal> {
  args: Args;
  returns: Ret;
  needs: readonly (keyof ExpressionDataSources)[];
}

export interface FuncValidationDef {
  // Optional: Validator function which runs when the function is validated. This allows a function to add its own
  // validation requirements. Use the addError() function if any errors are found.
  // This runs after the automatic 'number of arguments validator', and will not run if the automatic validator fails.
  validator?: (options: {
    rawArgs: unknown[];
    argTypes: (ExprVal | undefined)[];
    ctx: ValidationContext;
    path: string[];
  }) => void;

  // Optional: Set this to false if the automatic 'number of arguments validator' should NOT be run for this function.
  // Defaults to true.
  runNumArgsValidator?: boolean;
}

function required<T extends ExprVal>(type: T): ExprArgDef<T, 'required'> {
  return { type, variant: 'required' };
}

function optional<T extends ExprVal>(type: T): ExprArgDef<T, 'optional'> {
  return { type, variant: 'optional' };
}

function rest<T extends ExprVal>(type: T): ExprArgDef<T, 'rest'> {
  return { type, variant: 'rest' };
}

function args<A extends readonly AnyExprArg[]>(...args: A): A {
  return args;
}

type Source = keyof ExpressionDataSources;
function dataSources<S extends readonly Source[]>(...sources: S): S {
  return sources;
}

const noSources: never[] = [];

/**
 * All the function definitions available in expressions. The implementations themselves are located in
 * @see ExprFunctionImplementations
 */
export const ExprFunctionDefinitions = {
  argv: {
    args: args(required(ExprVal.Number)),
    returns: ExprVal.Any,
    needs: noSources,
  },
  value: {
    args: args(optional(ExprVal.String)),
    returns: ExprVal.Any,
    needs: noSources,
  },
  equals: {
    args: args(required(ExprVal.String), required(ExprVal.String)),
    returns: ExprVal.Boolean,
    needs: noSources,
  },
  notEquals: {
    args: args(required(ExprVal.String), required(ExprVal.String)),
    returns: ExprVal.Boolean,
    needs: noSources,
  },
  not: {
    args: args(required(ExprVal.Boolean)),
    returns: ExprVal.Boolean,
    needs: noSources,
  },
  greaterThan: {
    args: args(required(ExprVal.Number), required(ExprVal.Number)),
    returns: ExprVal.Boolean,
    needs: noSources,
  },
  greaterThanEq: {
    args: args(required(ExprVal.Number), required(ExprVal.Number)),
    returns: ExprVal.Boolean,
    needs: noSources,
  },
  lessThan: {
    args: args(required(ExprVal.Number), required(ExprVal.Number)),
    returns: ExprVal.Boolean,
    needs: noSources,
  },
  lessThanEq: {
    args: args(required(ExprVal.Number), required(ExprVal.Number)),
    returns: ExprVal.Boolean,
    needs: noSources,
  },
  concat: {
    args: args(rest(ExprVal.String)),
    returns: ExprVal.String,
    needs: noSources,
  },
  and: {
    args: args(required(ExprVal.Boolean), rest(ExprVal.Boolean)),
    returns: ExprVal.Boolean,
    needs: noSources,
  },
  or: {
    args: args(required(ExprVal.Boolean), rest(ExprVal.Boolean)),
    returns: ExprVal.Boolean,
    needs: noSources,
  },
  if: {
    args: args(required(ExprVal.Boolean), required(ExprVal.Any), optional(ExprVal.String), optional(ExprVal.Any)),
    returns: ExprVal.Any,
    needs: noSources,
  },
  instanceContext: {
    args: args(required(ExprVal.String)),
    returns: ExprVal.String,
    needs: dataSources('instanceDataSources'),
  },
  frontendSettings: {
    args: args(required(ExprVal.String)),
    returns: ExprVal.Any,
    needs: dataSources('applicationSettings'),
  },
  authContext: {
    args: args(required(ExprVal.String)),
    returns: ExprVal.Boolean,
    needs: dataSources('process'),
  },
  component: {
    args: args(required(ExprVal.String)),
    returns: ExprVal.Any,
    needs: dataSources(
      'layoutLookups',
      'currentDataModelPath',
      'isHiddenSelector',
      'dataModelNames',
      'formDataSelector',
    ),
  },
  dataModel: {
    args: args(required(ExprVal.String), optional(ExprVal.String)),
    returns: ExprVal.Any,
    needs: dataSources('defaultDataType', 'currentDataModelPath', 'dataModelNames', 'formDataSelector'),
  },
  countDataElements: {
    args: args(required(ExprVal.String)),
    returns: ExprVal.Number,
    needs: dataSources('dataElementSelector'),
  },
  externalApi: {
    args: args(required(ExprVal.String), required(ExprVal.String)),
    returns: ExprVal.String,
    needs: dataSources('externalApis'),
  },
  displayValue: {
    args: args(required(ExprVal.String)),
    returns: ExprVal.String,
    needs: dataSources('displayValues', 'isHiddenSelector', 'currentDataModelPath', 'layoutLookups'),
  },
  optionLabel: {
    args: args(required(ExprVal.String), required(ExprVal.Any)),
    returns: ExprVal.String,
    needs: dataSources('codeListSelector', 'langToolsSelector', 'currentDataModelPath'),
  },
  formatDate: {
    args: args(required(ExprVal.Date), optional(ExprVal.String)),
    returns: ExprVal.String,
    needs: dataSources('currentLanguage'),
  },
  compare: {
    args: args(required(ExprVal.Any), required(ExprVal.Any), required(ExprVal.Any), optional(ExprVal.Any)),
    returns: ExprVal.Boolean,
    needs: noSources,
  },
  round: {
    args: args(required(ExprVal.Number), optional(ExprVal.Number)),
    returns: ExprVal.String,
    needs: noSources,
  },
  text: {
    args: args(required(ExprVal.String)),
    returns: ExprVal.String,
    needs: dataSources('langToolsSelector', 'currentDataModelPath'),
  },
  linkToComponent: {
    args: args(required(ExprVal.String), required(ExprVal.String)),
    returns: ExprVal.String,
    needs: dataSources('layoutLookups', 'process', 'instanceDataSources', 'currentDataModelPath'),
  },
  linkToPage: {
    args: args(required(ExprVal.String), required(ExprVal.String)),
    returns: ExprVal.String,
    needs: dataSources('process', 'instanceDataSources'),
  },
  language: {
    args: args(),
    returns: ExprVal.String,
    needs: dataSources('currentLanguage'),
  },
  contains: {
    args: args(required(ExprVal.String), required(ExprVal.String)),
    returns: ExprVal.Boolean,
    needs: noSources,
  },
  notContains: {
    args: args(required(ExprVal.String), required(ExprVal.String)),
    returns: ExprVal.Boolean,
    needs: noSources,
  },
  endsWith: {
    args: args(required(ExprVal.String), required(ExprVal.String)),
    returns: ExprVal.Boolean,
    needs: noSources,
  },
  startsWith: {
    args: args(required(ExprVal.String), required(ExprVal.String)),
    returns: ExprVal.Boolean,
    needs: noSources,
  },
  stringReplace: {
    args: args(required(ExprVal.String), required(ExprVal.String), required(ExprVal.String)),
    returns: ExprVal.String,
    needs: noSources,
  },
  stringLength: {
    args: args(required(ExprVal.String)),
    returns: ExprVal.Number,
    needs: noSources,
  },
  stringSlice: {
    args: args(required(ExprVal.String), required(ExprVal.Number), optional(ExprVal.Number)),
    returns: ExprVal.String,
    needs: noSources,
  },
  stringIndexOf: {
    args: args(required(ExprVal.String), required(ExprVal.String)),
    returns: ExprVal.Number,
    needs: noSources,
  },
  commaContains: {
    args: args(required(ExprVal.String), required(ExprVal.String)),
    returns: ExprVal.Boolean,
    needs: noSources,
  },
  lowerCase: {
    args: args(required(ExprVal.String)),
    returns: ExprVal.String,
    needs: noSources,
  },
  upperCase: {
    args: args(required(ExprVal.String)),
    returns: ExprVal.String,
    needs: noSources,
  },
  upperCaseFirst: {
    args: args(required(ExprVal.String)),
    returns: ExprVal.String,
    needs: noSources,
  },
  lowerCaseFirst: {
    args: args(required(ExprVal.String)),
    returns: ExprVal.String,
    needs: noSources,
  },
  _experimentalSelectAndMap: {
    args: args(
      required(ExprVal.String),
      required(ExprVal.String),
      optional(ExprVal.String),
      optional(ExprVal.String),
      optional(ExprVal.Boolean),
    ),
    returns: ExprVal.String,
    needs: dataSources('defaultDataType', 'formDataSelector'),
  },
} satisfies { [key: string]: AnyFuncDef };

type Implementation<Name extends ExprFunctionName> = (
  this: EvaluateExpressionParams<ExprFunctions[Name]['needs']>,
  ...params: ArgsToActual<ExprFunctions[Name]['args']>
) => ExprValToActual<ExprFunctions[Name]['returns']> | null;

export const ExprFunctionImplementations: { [K in ExprFunctionName]: Implementation<K> } = {
  argv(idx) {
    if (!this.positionalArguments?.length) {
      throw new ExprRuntimeError(this.expr, this.path, 'No positional arguments available');
    }

    if (idx === null || idx < 0 || idx >= this.positionalArguments.length) {
      throw new ExprRuntimeError(this.expr, this.path, `Index ${idx} out of range`);
    }

    return this.positionalArguments[idx];
  },
  value(key) {
    const config = this.valueArguments;
    if (!config) {
      throw new ExprRuntimeError(this.expr, this.path, 'No value arguments available');
    }

    const realKey = key ?? config.defaultKey;
    if (!realKey || typeof realKey === 'symbol') {
      throw new ExprRuntimeError(
        this.expr,
        this.path,
        `Invalid key (expected string, got ${realKey ? typeof realKey : 'null'})`,
      );
    }

    if (!Object.prototype.hasOwnProperty.call(config.data, realKey)) {
      throw new ExprRuntimeError(
        this.expr,
        this.path,
        `Unknown key ${realKey}, Valid keys are: ${Object.keys(config.data).join(', ')}`,
      );
    }

    const value = config.data[realKey];
    return value ?? null;
  },
  equals(arg1, arg2) {
    return compare(this, 'equals', arg1, arg2);
  },
  notEquals(arg1, arg2) {
    return !compare(this, 'equals', arg1, arg2);
  },
  not: (arg) => !arg,
  greaterThan(arg1, arg2) {
    return compare(this, 'greaterThan', arg1, arg2);
  },
  greaterThanEq(arg1, arg2) {
    return compare(this, 'greaterThanEq', arg1, arg2);
  },
  lessThan(arg1, arg2) {
    return compare(this, 'lessThan', arg1, arg2);
  },
  lessThanEq(arg1, arg2) {
    return compare(this, 'lessThanEq', arg1, arg2);
  },
  concat: (...args) => args.join(''),
  and: (...args) => args.reduce((prev, cur) => prev && !!cur, true),
  or: (...args) => args.reduce((prev, cur) => prev || !!cur, false),
  if(condition, result, _, elseResult) {
    if (condition === true) {
      return result;
    }

    return elseResult === undefined ? null : elseResult;
  },
  instanceContext(key): string | null {
    const instanceDataSourcesKeys: { [key in keyof IInstanceDataSources]: true } = {
      instanceId: true,
      appId: true,
      instanceOwnerPartyId: true,
      instanceOwnerPartyType: true,
      instanceOwnerName: true,
    };

    if (key === null || instanceDataSourcesKeys[key] !== true) {
      throw new ExprRuntimeError(this.expr, this.path, `Unknown Instance context property ${key}`);
    }

    return (this.dataSources.instanceDataSources && this.dataSources.instanceDataSources[key]) || null;
  },
  frontendSettings(key) {
    if (key === null) {
      throw new ExprRuntimeError(this.expr, this.path, `Value cannot be null. (Parameter 'key')`);
    }

    return (this.dataSources.applicationSettings && this.dataSources.applicationSettings[key]) || null;
  },
  authContext(key) {
    const authContextKeys: { [key in keyof IAuthContext]: true } = {
      read: true,
      write: true,
      instantiate: true,
      confirm: true,
      sign: true,
      reject: true,
      complete: true,
    };

    if (key === null || authContextKeys[key] !== true) {
      throw new ExprRuntimeError(this.expr, this.path, `Unknown auth context property ${key}`);
    }

    const authContext = buildAuthContext(this.dataSources.process?.currentTask);
    return Boolean(authContext?.[key]);
  },
  component(id) {
    if (id === null) {
      throw new ExprRuntimeError(this.expr, this.path, `Cannot lookup component null`);
    }

    const target = this.dataSources.layoutLookups.allComponents[id];
    if (!target) {
      throw new ExprRuntimeError(this.expr, this.path, `Unable to find component with identifier ${id}`);
    }

    const rawBinding =
      target.dataModelBindings && 'simpleBinding' in target.dataModelBindings
        ? target.dataModelBindings.simpleBinding
        : undefined;

    if (!rawBinding) {
      throw new ExprRuntimeError(this.expr, this.path, `Component ${id} does not have a simpleBinding`);
    }

    const targetId = makeIndexedId(target.id, this.dataSources.currentDataModelPath, this.dataSources.layoutLookups);
    if (!targetId) {
      throw new NodeRelationNotFound(this, id);
    }

    if (this.dataSources.isHiddenSelector(targetId, 'node')) {
      // Not related to the current path, or currently hidden
      return null;
    }

    if (this.dataSources.currentDataModelPath) {
      const transposed = transposeDataBinding({
        subject: rawBinding,
        currentLocation: this.dataSources.currentDataModelPath,
      });
      return pickSimpleValue(transposed, this);
    }

    return pickSimpleValue(rawBinding, this);
  },
  dataModel(propertyPath, maybeDataType) {
    if (propertyPath === null) {
      throw new ExprRuntimeError(this.expr, this.path, `Cannot lookup dataModel null`);
    }

    const dataType = maybeDataType ?? this.dataSources.defaultDataType;
    if (!dataType) {
      throw new ExprRuntimeError(this.expr, this.path, `Cannot lookup dataType undefined`);
    }

    const reference: IDataModelReference = { dataType, field: propertyPath };
    if (this.dataSources.currentDataModelPath?.dataType === dataType) {
      const newReference = transposeDataBinding({
        subject: reference,
        currentLocation: this.dataSources.currentDataModelPath,
      });
      return pickSimpleValue(newReference, this);
    }

    return pickSimpleValue(reference, this);
  },
  countDataElements(dataType) {
    if (dataType === null) {
      throw new ExprRuntimeError(this.expr, this.path, `Expected dataType argument to be a string`);
    }

    const length = this.dataSources.dataElementSelector(
      (elements) => elements.filter((e) => e.dataType === dataType).length,
      [dataType],
    );

    if (length === ContextNotProvided) {
      return 0; // Stateless never has any data elements
    }

    return length;
  },
  externalApi(externalApiId, path) {
    if (externalApiId === null) {
      throw new ExprRuntimeError(this.expr, this.path, `Expected an external API id`);
    }
    if (!path) {
      return null;
    }

    const externalApiData: unknown = this.dataSources.externalApis.data[externalApiId];

    const res =
      externalApiData && typeof externalApiData === 'object' ? dot.pick(path, externalApiData) : externalApiData;

    if (!res || typeof res === 'object') {
      return null; // Return objects when the expression language supports them
    }

    return String(res);
  },
  displayValue(id) {
    if (id === null) {
      throw new ExprRuntimeError(this.expr, this.path, `Cannot lookup component null`);
    }
    const target = this.dataSources.layoutLookups.allComponents[id];
    if (!target) {
      throw new ExprRuntimeError(this.expr, this.path, `Unable to find component with identifier ${id}`);
    }

    const targetId = makeIndexedId(id, this.dataSources.currentDataModelPath, this.dataSources.layoutLookups);
    if (!targetId) {
      throw new NodeRelationNotFound(this, id);
    }

    if (this.dataSources.isHiddenSelector(targetId, 'node')) {
      // Not related to the current path, or currently hidden
      return null;
    }

    if (!(id in this.dataSources.displayValues)) {
      throw new ExprRuntimeError(
        this.expr,
        this.path,
        `Component of type '${target.type}' does not have a displayValue`,
      );
    }

    return this.dataSources.displayValues[id] ?? '';
  },
  optionLabel(optionsId, value) {
    if (optionsId === null) {
      throw new ExprRuntimeError(this.expr, this.path, `Expected an options id`);
    }

    const options = this.dataSources.codeListSelector(optionsId);
    if (!options) {
      throw new ExprRuntimeError(this.expr, this.path, `Could not find options with id "${optionsId}"`);
    }

    if (options === CodeListPending) {
      // We don't have the options yet, but it's not an error to ask for them.
      return null;
    }

    // Lax comparison by design. Numbers in raw option lists will be cast to strings by useGetOptions(), so we cannot
    // be strict about the type here.
    const option = options.find((o) => o.value == value);

    if (option) {
      return this.dataSources
        .langToolsSelector(this.dataSources.currentDataModelPath)
        .langAsNonProcessedString(option.label);
    }

    return null;
  },
  formatDate(date, format) {
    if (date === null) {
      return null;
    }
    const result = formatDateLocale(this.dataSources.currentLanguage, date, format ?? undefined);
    if (result.includes('Unsupported: ')) {
      throw new ExprRuntimeError(this.expr, this.path, `Unsupported date format token in '${format}'`);
    }

    return result;
  },
  compare(arg1, arg2, arg3, arg4) {
    return arg2 === 'not'
      ? !compare(this, arg3 as CompareOperator, arg1, arg4, 0, 3)
      : compare(this, arg2 as CompareOperator, arg1, arg3, 0, 2);
  },
  round(number, decimalPoints) {
    const realNumber = number === null ? 0 : number;
    const realDecimalPoints = decimalPoints === null || decimalPoints === undefined ? 0 : decimalPoints;
    return parseFloat(`${realNumber}`).toFixed(realDecimalPoints);
  },
  text(key) {
    if (key === null) {
      return null;
    }

    return this.dataSources.langToolsSelector(this.dataSources.currentDataModelPath).langAsNonProcessedString(key);
  },
  linkToComponent(linkText, id) {
    if (id == null) {
      window.logWarn('Component id was empty but must be set for linkToComponent to work');
      return null;
    }
    if (linkText == null) {
      window.logWarn('Link text was empty but must be set for linkToComponent to work');
      return null;
    }

    const target = this.dataSources.layoutLookups.allComponents[id];
    const pageKey = this.dataSources.layoutLookups.componentToPage[id];
    if (!target || !pageKey) {
      throw new ExprRuntimeError(this.expr, this.path, `Unable to find component with identifier ${id}`);
    }

    const taskId = this.dataSources.process?.currentTask?.elementId;
    const instanceId = this.dataSources.instanceDataSources?.instanceId;

    let url = '';
    if (taskId && instanceId) {
      url = `/instance/${instanceId}/${taskId}/${pageKey}`;
    } else {
      url = `/${pageKey}`;
    }

    const relativeId = makeIndexedId(id, this.dataSources.currentDataModelPath, this.dataSources.layoutLookups);
    if (!relativeId) {
      throw new NodeRelationNotFound(this, id);
    }

    const searchParams = new URLSearchParams();
    searchParams.set(SearchParams.FocusComponentId, relativeId);
    const newUrl = `${url}?${searchParams.toString()}`;
    return `<a href="${newUrl}" data-link-type="LinkToPotentialNode">${linkText}</a>`;
  },
  linkToPage(linkText, pageId) {
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
  language() {
    return this.dataSources.currentLanguage;
  },
  contains(string, stringToContain) {
    if (string === null || stringToContain === null) {
      return false;
    }

    return string.includes(stringToContain);
  },
  notContains(string, stringToNotContain) {
    if (string === null || stringToNotContain === null) {
      return true;
    }
    return !string.includes(stringToNotContain);
  },
  endsWith(string: string, stringToMatch: string): boolean {
    if (string === null || stringToMatch === null) {
      return false;
    }
    return string.endsWith(stringToMatch);
  },
  startsWith(string: string, stringToMatch: string): boolean {
    if (string === null || stringToMatch === null) {
      return false;
    }
    return string.startsWith(stringToMatch);
  },
  stringReplace(string, search, _replace) {
    if (!string || !search) {
      return null;
    }

    const replace = _replace === null ? '' : _replace;
    return string.replace(new RegExp(escapeStringRegexp(search), 'g'), replace);
  },
  stringLength: (string) => (string === null ? 0 : string.length),
  stringSlice(string, start, end) {
    if (start === null || end === null) {
      throw new ExprRuntimeError(
        this.expr,
        this.path,
        `Start/end index cannot be null (if you used an expression like stringIndexOf here, make sure to guard against null)`,
      );
    }
    if (string === null) {
      return null;
    }

    return string.slice(start, end);
  },
  stringIndexOf(string, search) {
    if (!string || !search) {
      return null;
    }

    const idx = string.indexOf(search);
    return idx === -1 ? null : idx;
  },
  commaContains(commaSeparatedString, stringToMatch) {
    if (commaSeparatedString === null || stringToMatch === null) {
      return false;
    }

    // Split the comma separated string into an array and remove whitespace from each part
    const parsedToArray = commaSeparatedString.split(',').map((part) => part.trim());
    return parsedToArray.includes(stringToMatch);
  },
  lowerCase(string) {
    if (string === null) {
      return null;
    }
    return string.toLowerCase();
  },
  upperCase(string) {
    if (string === null) {
      return null;
    }
    return string.toUpperCase();
  },
  upperCaseFirst(string) {
    if (string === null) {
      return null;
    }
    return string.charAt(0).toUpperCase() + string.slice(1);
  },
  lowerCaseFirst(string) {
    if (string === null) {
      return null;
    }
    return string.charAt(0).toLowerCase() + string.slice(1);
  },
  _experimentalSelectAndMap(path, propertyToSelect, prepend, append, appendToLastElement = true) {
    if (path === null || propertyToSelect == null) {
      throw new ExprRuntimeError(this.expr, this.path, `Cannot lookup dataModel null`);
    }

    const dataType = this.dataSources.defaultDataType;
    if (!dataType) {
      throw new ExprRuntimeError(this.expr, this.path, `Cannot lookup dataType undefined`);
    }
    const array = this.dataSources.formDataSelector({ field: path, dataType });
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
};

export const ExprFunctionValidationExtensions: { [K in ExprFunctionName]?: FuncValidationDef } = {
  if: {
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
    runNumArgsValidator: false,
  },
  dataModel: {
    validator({ rawArgs, ctx, path }) {
      if (rawArgs.length > 1 && rawArgs[1] !== null && typeof rawArgs[1] !== 'string') {
        addError(ctx, [...path, '[2]'], 'The data type must be a string (expressions cannot be used here)');
      }
    },
  },
  compare: {
    validator({ rawArgs, ctx, path }) {
      if (rawArgs.length === 4 && rawArgs[1] !== 'not') {
        addError(ctx, [...path, '[1]'], 'Second argument must be "not" when providing 4 arguments in total');
        return;
      }

      const opIdx = rawArgs.length === 4 ? 2 : 1;
      const op = rawArgs[opIdx];
      if (!(typeof op === 'string')) {
        addError(ctx, [...path, `[${opIdx + 1}]`], 'Invalid operator (it cannot be an expression or null)');
        return;
      }
      const validOperators = Object.keys(CompareOperators);
      if (!validOperators.includes(op)) {
        const validList = validOperators.map((o) => `"${o}"`).join(', ');
        addError(ctx, [...path, `[${opIdx + 1}]`], 'Invalid operator "%s", valid operators are %s', op, validList);
      }
    },
  },
  displayValue: {
    validator({ rawArgs, ctx, path }) {
      if (rawArgs.length > 1 && rawArgs[1] !== null && typeof rawArgs[1] !== 'string') {
        addError(ctx, [...path, '[2]'], 'The second argument must be a component id (expressions cannot be used here)');
      }
    },
  },
  optionLabel: {
    validator({ rawArgs, ctx, path }) {
      const optionsId = rawArgs[0];
      if (optionsId === null || typeof optionsId !== 'string') {
        addError(ctx, [...path, '[1]'], 'The first argument must be a string (expressions cannot be used here)');
      }
    },
  },
};

function pickSimpleValue(
  path: IDataModelReference,
  params: EvaluateExpressionParams<['dataModelNames', 'formDataSelector']>,
) {
  const isValidDataType = params.dataSources.dataModelNames.includes(path.dataType);
  if (!isValidDataType) {
    throw new ExprRuntimeError(params.expr, params.path, `Data model with type ${path.dataType} not found`);
  }

  const value = params.dataSources.formDataSelector(path);
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  return null;
}

/**
 * Allows you to cast an argument to a stricter type late during execution of an expression function, as opposed to
 * before the function runs (as arguments are processed on the way in). This is useful in functions such as
 * 'compare', where the operator will determine the type of the arguments, and cast them accordingly.
 */
function lateCastArg<T extends ExprVal>(
  context: EvaluateExpressionParams<[]>,
  arg: unknown,
  argIndex: number,
  type: T,
): ExprValToActual<T> | null {
  const actualIndex = argIndex + 1; // Adding 1 because the function name is at index 0
  const newContext = { ...context, path: [...context.path, `[${actualIndex}]`] };
  return exprCastValue(arg, type, newContext);
}

type CompareOpArg<T extends ExprVal, BothReq extends boolean> = BothReq extends true
  ? ExprValToActual<T>
  : ExprValToActual<T> | null;
type CompareOpImplementation<T extends ExprVal, BothReq extends boolean> = (
  this: EvaluateExpressionParams,
  a: CompareOpArg<T, BothReq>,
  b: CompareOpArg<T, BothReq>,
) => boolean;

export interface CompareOperatorDef<T extends ExprVal, BothReq extends boolean> {
  bothArgsMustBeValid: BothReq;
  extraValidators?: ((this: EvaluateExpressionParams, a: ExprValToActual<T>, b: ExprValToActual<T>) => void)[];
  argType: T;
  impl: CompareOpImplementation<T, BothReq>;
}

function defineCompareOp<T extends ExprVal, BothReq extends boolean>(
  def: CompareOperatorDef<T, BothReq>,
): CompareOperatorDef<T, BothReq> {
  return def;
}

/**
 * All the comparison operators available to execute inside the 'compare' function. This list of operators
 * have the following behaviors:
 */
export const CompareOperators = {
  equals: defineCompareOp({
    bothArgsMustBeValid: false,
    argType: ExprVal.String,
    impl: (a, b) => a === b,
  }),
  greaterThan: defineCompareOp({
    bothArgsMustBeValid: true,
    argType: ExprVal.Number,
    impl: (a, b) => a > b,
  }),
  greaterThanEq: defineCompareOp({
    bothArgsMustBeValid: true,
    argType: ExprVal.Number,
    impl: (a: number, b: number) => a >= b,
  }),
  lessThan: defineCompareOp({
    bothArgsMustBeValid: true,
    argType: ExprVal.Number,
    impl: (a: number, b: number) => a < b,
  }),
  lessThanEq: defineCompareOp({
    bothArgsMustBeValid: true,
    argType: ExprVal.Number,
    impl: (a: number, b: number) => a <= b,
  }),
  isBefore: defineCompareOp({
    bothArgsMustBeValid: true,
    argType: ExprVal.Date,
    extraValidators: [validateDates],
    impl: (a, b) => a < b,
  }),
  isBeforeEq: defineCompareOp({
    bothArgsMustBeValid: true,
    argType: ExprVal.Date,
    extraValidators: [validateDates],
    impl: (a, b) => a <= b,
  }),
  isAfter: defineCompareOp({
    bothArgsMustBeValid: true,
    argType: ExprVal.Date,
    extraValidators: [validateDates],
    impl: (a, b) => a > b,
  }),
  isAfterEq: defineCompareOp({
    bothArgsMustBeValid: true,
    argType: ExprVal.Date,
    extraValidators: [validateDates],
    impl: (a, b) => a >= b,
  }),
  isSameDay: defineCompareOp({
    bothArgsMustBeValid: true,
    argType: ExprVal.Date,
    extraValidators: [validateDates, validateDatesForSameDay],
    impl: (a, b) => a.toDateString() === b.toDateString(),
  }),
} as const;

type CompareOperator = keyof typeof CompareOperators;

function compare(
  ctx: EvaluateExpressionParams<[]>,
  operator: CompareOperator,
  arg1: unknown,
  arg2: unknown,
  idxArg1 = 1,
  idxArg2 = 2,
): boolean {
  const def = CompareOperators[operator];
  const a = lateCastArg(ctx, arg1, idxArg1, def.argType);
  const b = lateCastArg(ctx, arg2, idxArg2, def.argType);

  if (def.bothArgsMustBeValid && (a === null || b === null)) {
    return false;
  }

  for (const validator of def.extraValidators ?? []) {
    validator.call(ctx, a, b);
  }

  return def.impl.call(ctx, a, b);
}

function validateDatesForSameDay(this: EvaluateExpressionParams, a: ExprDate, b: ExprDate) {
  if (a.exprDateExtensions.timeZone !== b.exprDateExtensions.timeZone) {
    throw new ExprRuntimeError(
      this.expr,
      this.path,
      `Can not figure out if timestamps in different timezones are in the same day`,
    );
  }
}

function validateDates(this: EvaluateExpressionParams, a: ExprDate, b: ExprDate) {
  const sameTimezones = a.exprDateExtensions.timeZone === b.exprDateExtensions.timeZone;
  const eitherIsLocal = a.exprDateExtensions.timeZone === 'local' || b.exprDateExtensions.timeZone === 'local';
  if (!sameTimezones && eitherIsLocal) {
    throw new ExprRuntimeError(this.expr, this.path, `Can not compare timestamps where only one specify timezone`);
  }
}
