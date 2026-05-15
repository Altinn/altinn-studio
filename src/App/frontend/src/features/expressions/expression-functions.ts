import dot from 'dot-object';
import escapeStringRegexp from 'escape-string-regexp';

import { SearchParams } from 'src/core/routing/types';
import { evalExpr, exprCastValue } from 'src/features/expressions';
import { Decimal } from 'src/features/expressions/Decimal';
import { ExprRuntimeError, NodeRelationNotFound } from 'src/features/expressions/errors';
import { AverageFunctionEvaluator } from 'src/features/expressions/function-evaluators/AverageFunctionEvaluator';
import { JmespathFunctionEvaluator } from 'src/features/expressions/function-evaluators/JmespathFunctionEvaluator';
import { ObjectFunctionEvaluator } from 'src/features/expressions/function-evaluators/ObjectFunctionEvaluator';
import { SumFunctionEvaluator } from 'src/features/expressions/function-evaluators/SumFunctionEvaluator';
import { ExprVal } from 'src/features/expressions/types';
import { addError, ExprValidation } from 'src/features/expressions/validation';
import { makeIndexedId } from 'src/features/form/layout/utils/makeIndexedId';
import { buildAuthContext } from 'src/utils/authContext';
import { transposeDataBinding } from 'src/utils/databindings/DataBinding';
import { formatDateLocale } from 'src/utils/dateUtils';
import { collectHiddenSources, evaluateHiddenSources } from 'src/utils/layout/hiddenUtils';
import type { EvaluateExpressionParams } from 'src/features/expressions';
import type {
  AnyExprArg,
  ExprArgDef,
  ExprDate,
  ExprFunctionName,
  ExprFunctions,
  ExprValToActual,
  ExprValToActualOrExpr,
  ValidObject,
  ValidValue,
} from 'src/features/expressions/types';
import type { ValidationContext } from 'src/features/expressions/validation';
import type { IDataModelReference } from 'src/layout/common.generated';
import type { IInstanceDataSources } from 'src/types/shared';

type ArgsToActual<T extends readonly AnyExprArg[]> = {
  [Index in keyof T]: T[Index]['variant'] extends 'optional'
    ? ExprValToActual<T[Index]['type']> | null | undefined
    : ExprValToActual<T[Index]['type']> | null;
};

export type AnyFuncDef = FuncDef<readonly AnyExprArg[], ExprVal>;
export interface FuncDef<Args extends readonly AnyExprArg[], Ret extends ExprVal> {
  args: Args;
  returns: Ret;
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

/**
 * All the function definitions available in expressions. The implementations themselves are located in
 * @see ExprFunctionImplementations
 */
export const ExprFunctionDefinitions = {
  argv: {
    args: args(required(ExprVal.Number)),
    returns: ExprVal.Any,
  },
  value: {
    args: args(optional(ExprVal.String)),
    returns: ExprVal.Any,
  },
  equals: {
    args: args(required(ExprVal.String), required(ExprVal.String)),
    returns: ExprVal.Boolean,
  },
  notEquals: {
    args: args(required(ExprVal.String), required(ExprVal.String)),
    returns: ExprVal.Boolean,
  },
  not: {
    args: args(required(ExprVal.Boolean)),
    returns: ExprVal.Boolean,
  },
  greaterThan: {
    args: args(required(ExprVal.Number), required(ExprVal.Number)),
    returns: ExprVal.Boolean,
  },
  greaterThanEq: {
    args: args(required(ExprVal.Number), required(ExprVal.Number)),
    returns: ExprVal.Boolean,
  },
  lessThan: {
    args: args(required(ExprVal.Number), required(ExprVal.Number)),
    returns: ExprVal.Boolean,
  },
  lessThanEq: {
    args: args(required(ExprVal.Number), required(ExprVal.Number)),
    returns: ExprVal.Boolean,
  },
  plus: {
    args: args(required(ExprVal.Number), rest(ExprVal.Number)),
    returns: ExprVal.Number,
  },
  minus: {
    args: args(required(ExprVal.Number), required(ExprVal.Number)),
    returns: ExprVal.Number,
  },
  multiply: {
    args: args(required(ExprVal.Number), rest(ExprVal.Number)),
    returns: ExprVal.Number,
  },
  divide: {
    args: args(required(ExprVal.Number), required(ExprVal.Number)),
    returns: ExprVal.Number,
  },
  concat: {
    args: args(rest(ExprVal.String)),
    returns: ExprVal.String,
  },
  and: {
    args: args(required(ExprVal.Boolean), rest(ExprVal.Boolean)),
    returns: ExprVal.Boolean,
  },
  or: {
    args: args(required(ExprVal.Boolean), rest(ExprVal.Boolean)),
    returns: ExprVal.Boolean,
  },
  if: {
    args: args(required(ExprVal.Boolean), required(ExprVal.Any), optional(ExprVal.String), optional(ExprVal.Any)),
    returns: ExprVal.Any,
  },
  instanceContext: {
    args: args(required(ExprVal.String)),
    returns: ExprVal.String,
  },
  frontendSettings: {
    args: args(required(ExprVal.String)),
    returns: ExprVal.Any,
  },
  authContext: {
    args: args(required(ExprVal.String)),
    returns: ExprVal.Boolean,
  },
  component: {
    args: args(required(ExprVal.String)),
    returns: ExprVal.Any,
  },
  dataModel: {
    args: args(required(ExprVal.String), optional(ExprVal.String)),
    returns: ExprVal.Any,
  },
  countDataElements: {
    args: args(required(ExprVal.String)),
    returns: ExprVal.Number,
  },
  externalApi: {
    args: args(required(ExprVal.String), required(ExprVal.String)),
    returns: ExprVal.String,
  },
  displayValue: {
    args: args(required(ExprVal.String)),
    returns: ExprVal.String,
  },
  optionLabel: {
    args: args(required(ExprVal.String), required(ExprVal.Any)),
    returns: ExprVal.String,
  },
  formatDate: {
    args: args(required(ExprVal.Date), optional(ExprVal.String)),
    returns: ExprVal.String,
  },
  compare: {
    args: args(required(ExprVal.Any), required(ExprVal.Any), required(ExprVal.Any), optional(ExprVal.Any)),
    returns: ExprVal.Boolean,
  },
  round: {
    args: args(required(ExprVal.Number), optional(ExprVal.Number)),
    returns: ExprVal.String,
  },
  text: {
    args: args(required(ExprVal.String)),
    returns: ExprVal.String,
  },
  linkToComponent: {
    args: args(required(ExprVal.String), required(ExprVal.String), optional(ExprVal.Boolean)),
    returns: ExprVal.String,
  },
  linkToPage: {
    args: args(required(ExprVal.String), required(ExprVal.String), optional(ExprVal.Boolean)),
    returns: ExprVal.String,
  },
  language: {
    args: args(),
    returns: ExprVal.String,
  },
  contains: {
    args: args(required(ExprVal.String), required(ExprVal.String)),
    returns: ExprVal.Boolean,
  },
  notContains: {
    args: args(required(ExprVal.String), required(ExprVal.String)),
    returns: ExprVal.Boolean,
  },
  endsWith: {
    args: args(required(ExprVal.String), required(ExprVal.String)),
    returns: ExprVal.Boolean,
  },
  startsWith: {
    args: args(required(ExprVal.String), required(ExprVal.String)),
    returns: ExprVal.Boolean,
  },
  stringReplace: {
    args: args(required(ExprVal.String), required(ExprVal.String), required(ExprVal.String)),
    returns: ExprVal.String,
  },
  stringLength: {
    args: args(required(ExprVal.String)),
    returns: ExprVal.Number,
  },
  stringSlice: {
    args: args(required(ExprVal.String), required(ExprVal.Number), optional(ExprVal.Number)),
    returns: ExprVal.String,
  },
  stringIndexOf: {
    args: args(required(ExprVal.String), required(ExprVal.String)),
    returns: ExprVal.Number,
  },
  commaContains: {
    args: args(required(ExprVal.String), required(ExprVal.String)),
    returns: ExprVal.Boolean,
  },
  lowerCase: {
    args: args(required(ExprVal.String)),
    returns: ExprVal.String,
  },
  upperCase: {
    args: args(required(ExprVal.String)),
    returns: ExprVal.String,
  },
  upperCaseFirst: {
    args: args(required(ExprVal.String)),
    returns: ExprVal.String,
  },
  lowerCaseFirst: {
    args: args(required(ExprVal.String)),
    returns: ExprVal.String,
  },
  list: {
    args: args(rest(ExprVal.Any)),
    returns: ExprVal.List,
    needs: noSources,
  },
  object: {
    args: args(rest(ExprVal.Any)),
    returns: ExprVal.Object,
    needs: noSources,
  },
  jmespath: {
    args: args(required(ExprVal.Any), required(ExprVal.String)),
    returns: ExprVal.Any,
    needs: noSources,
  },
  sum: {
    args: args(required(ExprVal.List)),
    returns: ExprVal.Number,
    needs: noSources,
  },
  average: {
    args: args(required(ExprVal.List), required(ExprVal.Number)),
    returns: ExprVal.Number,
    needs: noSources,
  },
  count: {
    args: args(required(ExprVal.List)),
    returns: ExprVal.Number,
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
  },
} satisfies { [key: string]: AnyFuncDef };

type Implementation<Name extends ExprFunctionName> = (
  this: EvaluateExpressionParams,
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
  plus(...terms) {
    return terms.reduce((prev, current) => applyBinaryOperation(Decimal.add, [prev, current]), 0);
  },
  minus(minuend, subtrahend) {
    return applyBinaryOperation(Decimal.subtract, [minuend, subtrahend]);
  },
  multiply(...factors) {
    return factors.reduce((prev, current) => applyBinaryOperation(Decimal.multiply, [prev, current]), 1);
  },
  divide(dividend, divisor) {
    const divideNumbers = (dividendNumber: number, divisorNumber: number): number => {
      if (divisorNumber === 0) {
        throw new ExprRuntimeError(this.expr, this.path, 'The second argument is 0, cannot divide by 0');
      } else {
        return Decimal.divide(dividendNumber, divisorNumber);
      }
    };
    return applyBinaryOperation(divideNumbers, [dividend, divisor]);
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

    const instanceDataSources = this.dataSources.instance.getDataSources();
    return (instanceDataSources && instanceDataSources[key]) || null;
  },
  frontendSettings(key) {
    if (key === null) {
      throw new ExprRuntimeError(this.expr, this.path, `Value cannot be null. (Parameter 'key')`);
    }

    const applicationSettings = this.dataSources.application.getSettings();
    return (applicationSettings && applicationSettings[key]) || null;
  },
  authContext(key) {
    if (key === null) {
      throw new ExprRuntimeError(this.expr, this.path, `Auth context key cannot be null`);
    }

    const process = this.dataSources.instance.getProcess();
    const authContext = buildAuthContext(process?.currentTask);
    const hasAction = authContext?.[key];
    if (hasAction === undefined) {
      throw new ExprRuntimeError(
        this.expr,
        this.path,
        `Unknown Auth context property ${key} for task ${process?.currentTask?.elementId} (allowed keys are {${Object.keys(authContext).join(', ')}})`,
      );
    }
    return Boolean(hasAction);
  },
  component(id) {
    if (id === null) {
      throw new ExprRuntimeError(this.expr, this.path, `Cannot lookup component null`);
    }

    const layoutLookups = this.dataSources.layout.getLookups();
    const target = layoutLookups?.allComponents[id];
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

    if (!makeIndexedId(target.id, this.dataSources.currentDataModelPath, layoutLookups)) {
      throw new NodeRelationNotFound(this, id);
    }

    if (isComponentOrAncestorHidden(this, id)) {
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

    const defaultDataType = this.dataSources.formData.defaultDataType();
    const dataType = maybeDataType ?? defaultDataType;
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

    return this.dataSources.instance.countDataElements(dataType);
  },
  externalApi(externalApiId, path) {
    if (externalApiId === null) {
      throw new ExprRuntimeError(this.expr, this.path, `Expected an external API id`);
    }
    if (!path) {
      return null;
    }

    const externalApiData: unknown = this.dataSources.externalApi.getAll().data[externalApiId];

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
    const layoutLookups = this.dataSources.layout.getLookups();
    const target = layoutLookups?.allComponents[id];
    if (!target) {
      throw new ExprRuntimeError(this.expr, this.path, `Unable to find component with identifier ${id}`);
    }

    if (!makeIndexedId(id, this.dataSources.currentDataModelPath, layoutLookups)) {
      throw new NodeRelationNotFound(this, id);
    }

    if (isComponentOrAncestorHidden(this, id)) {
      return null;
    }

    const displayValue = this.dataSources.displayValue.get(id);
    if (displayValue === undefined) {
      throw new ExprRuntimeError(
        this.expr,
        this.path,
        `Component of type '${target.type}' does not have a displayValue`,
      );
    }

    return displayValue ?? '';
  },
  optionLabel(optionsId, value) {
    if (optionsId === null) {
      throw new ExprRuntimeError(this.expr, this.path, `Expected an options id`);
    }

    const options = this.dataSources.options.getStaticOptions(optionsId);
    if (!options) {
      throw new ExprRuntimeError(this.expr, this.path, `Could not find options with id "${optionsId}"`);
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
    const result = formatDateLocale(this.dataSources.context.currentLanguage(), date, format ?? undefined);
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
  linkToComponent(linkText, id, enableBackButton = false) {
    if (id == null) {
      window.logWarn('Component id was empty but must be set for linkToComponent to work');
      return null;
    }
    if (linkText == null) {
      window.logWarn('Link text was empty but must be set for linkToComponent to work');
      return null;
    }

    const layoutLookups = this.dataSources.layout.getLookups();
    const target = layoutLookups?.allComponents[id];
    const pageKey = layoutLookups?.componentToPage[id];
    if (!target || !pageKey) {
      throw new ExprRuntimeError(this.expr, this.path, `Unable to find component with identifier ${id}`);
    }

    const taskId = this.dataSources.instance.getProcess()?.currentTask?.elementId;
    const instanceId = this.dataSources.instance.getDataSources()?.instanceId;

    let url: string;
    if (taskId && instanceId) {
      url = `/instance/${instanceId}/${taskId}/${pageKey}`;
    } else {
      url = `/${pageKey}`;
    }

    const relativeId = makeIndexedId(id, this.dataSources.currentDataModelPath, layoutLookups);
    if (!relativeId) {
      throw new NodeRelationNotFound(this, id);
    }

    const searchParams = new URLSearchParams();
    searchParams.set(SearchParams.FocusComponentId, relativeId);
    const backTo = this.dataSources.context.currentPage();
    if (enableBackButton && backTo && backTo !== pageKey) {
      searchParams.append(SearchParams.BackToPage, backTo);
    }
    const newUrl = `${url}?${searchParams.toString()}`;
    return `<a href="${newUrl}" data-link-type="LinkToPotentialNode">${linkText}</a>`;
  },
  linkToPage(linkText, pageId, enableBackButton = false) {
    if (pageId == null) {
      window.logWarn('Page id was empty but must be set for linkToPage to work');
      return null;
    }
    if (linkText == null) {
      window.logWarn('Link text was empty but must be set for linkToPage to work');
      return null;
    }
    const taskId = this.dataSources.instance.getProcess()?.currentTask?.elementId;
    const instanceId = this.dataSources.instance.getDataSources()?.instanceId;

    let url: string;
    if (taskId && instanceId) {
      url = `/instance/${instanceId}/${taskId}/${pageId}`;
    } else {
      url = `/${pageId}`;
    }

    const backTo = this.dataSources.context.currentPage();
    if (enableBackButton && backTo && backTo !== pageId) {
      const searchParams = new URLSearchParams();
      searchParams.set(SearchParams.BackToPage, backTo);
      url = `${url}?${searchParams.toString()}`;
    }
    return `<a href="${url}" data-link-type="LinkToPotentialPage">${linkText}</a>`;
  },
  language() {
    return this.dataSources.context.currentLanguage();
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
  list(...items): ValidValue[] {
    return items;
  },
  object(...argumentList): ValidObject {
    return new ObjectFunctionEvaluator(this, argumentList).evaluate();
  },
  jmespath(...argumentList): ValidValue {
    return new JmespathFunctionEvaluator(this, argumentList).evaluate();
  },
  sum(...argumentList): number {
    return new SumFunctionEvaluator(this, argumentList).evaluate();
  },
  average(...argumentList): number | null {
    return new AverageFunctionEvaluator(this, argumentList).evaluate();
  },
  count(list): number {
    return list?.length || 0;
  },
  _experimentalSelectAndMap(path, propertyToSelect, prepend, append, appendToLastElement = true) {
    if (path === null || propertyToSelect == null) {
      throw new ExprRuntimeError(this.expr, this.path, `Cannot lookup dataModel null`);
    }

    const dataType = this.dataSources.formData.defaultDataType();
    if (!dataType) {
      throw new ExprRuntimeError(this.expr, this.path, `Cannot lookup dataType undefined`);
    }
    const array = this.dataSources.formData.read({ dataType, field: path });
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
  component: {
    validator({ rawArgs, ctx, path }) {
      if (rawArgs.length > 1 && rawArgs[1] !== null && typeof rawArgs[1] !== 'string') {
        addError(ctx, [...path, '[2]'], 'The second argument must be a component id (expressions cannot be used here)');
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
  object: {
    validator({ rawArgs, ctx, path }) {
      if (rawArgs.length % 2 === 1) {
        addError(ctx, path, 'The object function must have an even number of arguments');
      }
    },
  },
};

function pickSimpleValue(path: IDataModelReference, params: EvaluateExpressionParams) {
  const isValidDataType = params.dataSources.formData.hasDataType(path.dataType);
  if (!isValidDataType) {
    throw new ExprRuntimeError(params.expr, params.path, `Data model with type ${path.dataType} not found`);
  }

  const value = params.dataSources.formData.read(path);
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  return null;
}

function isComponentOrAncestorHidden(ctx: EvaluateExpressionParams, componentId: string) {
  const layoutLookups = ctx.dataSources.layout.getLookups();
  if (!layoutLookups) {
    throw new ExprRuntimeError(ctx.expr, ctx.path, 'Layouts not available in this context, cannot look up component');
  }
  const hiddenSources = collectHiddenSources(componentId, layoutLookups).reverse();
  const pageKey = layoutLookups.componentToPage[componentId];
  return evaluateHiddenSources({
    hiddenSources,
    pageOrder: [],
    pageKey,
    evalHiddenExpression: (expr, source) =>
      evalEmbeddedExpression(
        ctx as EvaluateExpressionParams,
        expr,
        source.type === 'hiddenPage'
          ? `Hidden expression for page ${source.id} failed`
          : `Expression in property ${source.type} for component ${source.id} failed`,
      ),
  }).hidden;
}

function evalEmbeddedExpression(
  ctx: EvaluateExpressionParams,
  expr: ExprValToActualOrExpr<ExprVal.Boolean> | undefined,
  errorIntroText: string,
) {
  if (!ExprValidation.isValidOrScalar(expr, ExprVal.Boolean)) {
    return false;
  }

  return evalExpr(expr, ctx.dataSources, {
    errorIntroText,
    defaultValue: false,
    returnType: ExprVal.Boolean,
    onBeforeFunctionCall: ctx.callbacks.onBeforeFunctionCall,
    onAfterFunctionCall: ctx.callbacks.onAfterFunctionCall,
    positionalArguments: ctx.positionalArguments,
    valueArguments: ctx.valueArguments,
  });
}

/**
 * Allows you to cast an argument to a stricter type late during execution of an expression function, as opposed to
 * before the function runs (as arguments are processed on the way in). This is useful in functions such as
 * 'compare', where the operator will determine the type of the arguments, and cast them accordingly.
 */
function lateCastArg<T extends ExprVal>(
  context: EvaluateExpressionParams,
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
  ctx: EvaluateExpressionParams,
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

function applyBinaryOperation(
  operation: (a: number, b: number) => number,
  [a, b]: [number | null, number | null],
): number {
  return operation(a || 0, b || 0);
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
