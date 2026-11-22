import dot from 'dot-object';
import deepEqual from 'fast-deep-equal';
import { v4 as uuidv4 } from 'uuid';
import type { IDataModelReference } from '@app/layout-contract/generated/common.generated';
import type { JSONSchema7 } from 'json-schema';

import { evalExpr, ExprTypes } from 'src/features/expressions';
import { ExprVal } from 'src/features/expressions/types';
import { ExprValidation } from 'src/features/expressions/validation';
import { convertData } from 'src/features/formData/convertData';
import { ALTINN_ROW_ID } from 'src/features/formData/types';
import type { SchemaLookupTool } from 'src/features/datamodel/SchemaLookupTool';
import type { EvaluateExpressionParams } from 'src/features/expressions';
import type { ExpressionDataSources } from 'src/features/expressions/runtime/useExpressionDataSources';
import type { ExprValToActual, ExprValToActualOrExpr } from 'src/features/expressions/types';
import type { FormStoreState } from 'src/features/form/FormContext';
import type { FDValue } from 'src/features/formData/FormDataWrite';

export interface CalculationConfig {
  calculations: { field: string; expression: ExprValToActualOrExpr<ExprVal.Any> }[];
}

export function resolveCalculationConfig(config: unknown): CalculationConfig | null {
  if (!config || typeof config !== 'object' || !('calculations' in config)) {
    return null;
  }
  if (!Array.isArray(config.calculations)) {
    return null;
  }
  const calculations: CalculationConfig['calculations'] = [];
  for (const [index, definition] of (config.calculations as unknown[]).entries()) {
    const isObject = !!definition && typeof definition === 'object';
    const field = isObject && 'field' in definition ? definition.field : undefined;
    const expression = isObject && 'expression' in definition ? definition.expression : undefined;
    const name = typeof field === 'string' ? field : `calculations[${index}]`;
    if (typeof field !== 'string' || field.trim() === '' || expression === undefined || expression === null) {
      window.logWarn(`Skipping invalid calculation for ${name}`);
    } else if (ExprValidation.isValidOrScalar(expression, ExprVal.Any, `Invalid calculation for ${name}`)) {
      calculations.push({ field, expression });
    }
    // An invalid expression is skipped too, and the validation has logged it as an error
  }
  return { calculations };
}

/** Resolve targets using the schema, including missing objects but never inventing repeating rows. */
export function resolveCalculationTargets(field: string, data: object, lookupTool: SchemaLookupTool): string[] {
  const parts = field.split('.');
  const results: string[] = [];

  function visit(value: unknown, index: number, prefix: string) {
    if (index === parts.length) {
      results.push(prefix);
      return;
    }
    const match = /^([^[\]]+)(?:\[(\d*)\])?$/.exec(parts[index]);
    if (!match) {
      return;
    }
    const [, key, explicitIndex] = match;
    const path = prefix ? `${prefix}.${key}` : key;
    const [schema] = lookupTool.getSchemaForPath(path);
    if (!schema) {
      return;
    }
    const child: unknown = value && typeof value === 'object' ? value[key] : undefined;
    const isArray = schema.type === 'array' || (Array.isArray(schema.type) && schema.type.includes('array'));
    if (isArray && (index < parts.length - 1 || explicitIndex !== undefined)) {
      if (!Array.isArray(child)) {
        return;
      }
      for (let row = 0; row < child.length; row++) {
        if (explicitIndex && row !== Number(explicitIndex)) {
          continue;
        }
        if (child[row] !== null && child[row] !== undefined) {
          visit(child[row], index + 1, `${path}[${row}]`);
        }
      }
    } else if (explicitIndex === undefined) {
      visit(child, index + 1, path);
    }
  }

  visit(data, 0, '');
  return results;
}

function hasType(schema: JSONSchema7, type: string): boolean {
  return schema.type === type || (Array.isArray(schema.type) && schema.type.some((candidate) => candidate === type));
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

/** A list with an object in it is merged as rows, and every row must then be an object (checked in mergeRows). */
function isListOfObjects(value: unknown): value is unknown[] {
  return Array.isArray(value) && value.some(isObject);
}

function schemaTypes(schema: JSONSchema7): string[] {
  const types: string[] = Array.isArray(schema.type) ? [...schema.type] : schema.type ? [schema.type] : [];
  for (const alternative of [...(schema.anyOf ?? []), ...(schema.oneOf ?? [])]) {
    if (typeof alternative === 'object') {
      types.push(...schemaTypes(alternative));
    }
  }
  return types;
}

const castContext = { expr: ['calculation'], path: [] } as unknown as EvaluateExpressionParams;

/** Casts a value with the rules expressions use for their arguments, or gives undefined when it cannot. */
function castLikeArgument<T extends ExprVal.Boolean | ExprVal.Number | ExprVal.String>(
  value: string | number | boolean,
  type: T,
): ExprValToActual<T> | undefined {
  try {
    return ExprTypes[type].impl.call(castContext, value) as ExprValToActual<T>;
  } catch {
    return undefined;
  }
}

/**
 * Converts a scalar with the same rules as expressions use for their arguments, which the backend shares: a
 * number target takes numbers and strictly formatted numeric strings, a boolean target takes true, false, 1 and 0,
 * also as strings, and a string target takes the text of a number or boolean. A string is written as it is.
 * A target with an integer type only takes whole numbers.
 */
function convertScalar(
  result: string | number | boolean,
  schema: JSONSchema7,
): { value: FDValue; error: false } | { error: true } {
  const types = schemaTypes(schema);
  if (types.includes('string')) {
    return { value: typeof result === 'string' ? result : castLikeArgument(result, ExprVal.String), error: false };
  }
  if (types.includes('number') || types.includes('integer')) {
    const value = castLikeArgument(result, ExprVal.Number);
    if (value === undefined || value === null || !Number.isFinite(value)) {
      return { error: true };
    }
    const xsdType = schema['@xsdType'];
    if (types.includes('integer') || xsdType === 'int' || xsdType === 'long' || xsdType === 'short') {
      // convertData checks the range of the @xsdType
      const converted = convertData(value, schema);
      return Number.isInteger(value) && !converted.error ? { value, error: false } : { error: true };
    }
    return { value, error: false };
  }
  if (types.includes('boolean')) {
    const value = castLikeArgument(result, ExprVal.Boolean);
    return value === undefined || value === null ? { error: true } : { value, error: false };
  }
  return { error: true };
}

/** Converts the values that replace the target as a whole: scalars, null and lists of primitives. */
function convertCalculationResult(
  result: unknown,
  target: string,
  lookupTool: SchemaLookupTool,
): { value: FDValue; error: false } | { error: true } {
  const [schema] = lookupTool.getSchemaForPath(target);
  if (!schema) {
    return { error: true };
  }
  if (result === null) {
    // Any field may be null until validation, also numbers and booleans that cannot be null when the data is submitted
    return { value: null, error: false };
  }
  if (Array.isArray(result) && hasType(schema, 'array')) {
    const values: FDValue[] = [];
    for (const [index, item] of result.entries()) {
      if (item === null && isNonNullableValueType(`${target}[${index}]`, lookupTool)) {
        // The backend cannot deserialize the list, so it keeps the list as it is
        return { error: true };
      }
      const converted = convertCalculationResult(item, `${target}[${index}]`, lookupTool);
      if (converted.error) {
        return converted;
      }
      values.push(converted.value);
    }
    return { value: values, error: false };
  }
  if (typeof result === 'string' || typeof result === 'number' || typeof result === 'boolean') {
    return convertScalar(result, schema);
  }
  return { error: true };
}

/**
 * A number or boolean that cannot be null is a non-nullable value type in the C# model when its object requires it, or
 * when it is an item in a list. Studio generates a nullable type for the others.
 */
function isNonNullableValueType(target: string, lookupTool: SchemaLookupTool): boolean {
  const [schema] = lookupTool.getSchemaForPath(target, true);
  if (!schema) {
    return false;
  }
  if (!target.endsWith(']')) {
    const lastDot = target.lastIndexOf('.');
    const [parentSchema] = lookupTool.getSchemaForPath(lastDot < 0 ? '' : target.slice(0, lastDot));
    if (!parentSchema?.required?.includes(target.slice(lastDot + 1))) {
      return false;
    }
  }
  const types = schemaTypes(schema);
  return !types.includes('null') && types.some((type) => type === 'number' || type === 'integer' || type === 'boolean');
}

interface CalculationTarget {
  dataType: string;
  model: FormStoreState['data']['models'][string];
  lookupTool: SchemaLookupTool;
}

/**
 * Writes a result the same way the backend does: an object sets the properties it contains and leaves the others
 * alone, and a list of objects is merged row by row, so existing rows keep their row id and the properties the result
 * leaves out. Other values replace the target.
 */
function writeCalculationResult(target: string, result: unknown, { dataType, model, lookupTool }: CalculationTarget) {
  if (isObject(result)) {
    mergeObject(target, result, { dataType, model, lookupTool });
    return;
  }
  if (isListOfObjects(result)) {
    mergeRows(target, result, { dataType, model, lookupTool });
    return;
  }
  if (result === null && isNonNullableValueType(target, lookupTool)) {
    // The backend sets the default value of the field instead, which the frontend gets when the data is saved
    window.logWarnOnce(`Could not calculate null into the non-nullable field ${dataType}.${target}`);
    return;
  }
  const converted = convertCalculationResult(result, target, lookupTool);
  if (converted.error) {
    window.logWarnOnce(`Could not convert calculation result for ${dataType}.${target}`);
    return;
  }
  if (converted.value === null && dot.pick(target, model.currentData) === undefined) {
    // An absent value already means null. Do not create missing parent objects just to clear a field.
    dot.delete(target, model.invalidCurrentData);
    return;
  }
  // Keep explicit nulls stable across saves. Deleting them makes every nullable value returned by
  // the backend look like another local change and can trigger an endless series of saves.
  if (!deepEqual(dot.pick(target, model.currentData), converted.value)) {
    setValue(target, converted.value, model.currentData);
  }
  dot.delete(target, model.invalidCurrentData);
}

/**
 * dot.str, except that an item in a list at the top level, such as numbers[1], is set in the list. dot-object only
 * reads the brackets in a path with a dot, and writes a property named numbers[1] instead.
 */
function setValue(path: string, value: unknown, data: object) {
  const topLevelItem = /^([^.[\]]+)\[(\d+)]$/.exec(path);
  const list = topLevelItem ? (data as Record<string, unknown>)[topLevelItem[1]] : undefined;
  if (topLevelItem && Array.isArray(list)) {
    list[Number(topLevelItem[2])] = value;
    return;
  }
  dot.str(path, value, data);
}

function mergeObject(target: string, result: Record<string, unknown>, context: CalculationTarget) {
  for (const [key, value] of Object.entries(result)) {
    // The row id is not in the schema. A row copied from another group brings its own, and keeps it. The backend
    // stores the id as a Guid, so anything else keeps the existing id, as on the backend.
    if (key === ALTINN_ROW_ID) {
      const rowId = asRowId(value);
      if (rowId === undefined) {
        window.logWarnOnce(`Could not convert calculation result for ${context.dataType}.${target}.${key}`);
      } else {
        dot.str(`${target}.${key}`, rowId, context.model.currentData);
      }
      continue;
    }
    writeCalculationResult(`${target}.${key}`, value, context);
  }
}

const guidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const emptyGuid = '00000000-0000-0000-0000-000000000000';

/** A row id is a GUID other than the empty one, written in lowercase as the backend writes a Guid. */
function asRowId(value: unknown): string | undefined {
  if (typeof value !== 'string' || !guidPattern.test(value)) {
    return undefined;
  }
  const rowId = value.toLowerCase();
  return rowId === emptyGuid ? undefined : rowId;
}

/**
 * Merges a list of objects into the rows of a list, the same way the backend does. When every result row has an id,
 * each merges into the row with that id, wherever it is, or becomes a new row with that id. When none has, each merges
 * into the row at its position. A result where only some rows have an id is logged and leaves the list as it is, since
 * it is not clear which rule was meant. The rows end up in the order of the result, and rows it does not name are
 * removed.
 */
function mergeRows(target: string, rows: unknown[], context: CalculationTarget) {
  const { dataType, model, lookupTool } = context;
  // Check the result before anything is written. Bad data can give a result like this, so it is logged and the list
  // is left as it is, as when an expression fails to evaluate.
  const resultRowIds: (string | undefined)[] = [];
  const seenRowIds = new Set<string>();
  for (const [index, row] of rows.entries()) {
    if (!isObject(row)) {
      // A row that is not an object cannot be shown, so the list is left as it is
      window.logErrorOnce(`The calculation for ${dataType}.${target} gives a list where row ${index} is not an object`);
      return;
    }
    const rowId = asRowId(row[ALTINN_ROW_ID]);
    if (rowId !== undefined) {
      if (seenRowIds.has(rowId)) {
        // Rows are matched by id, so a list that cannot be told apart is left as it is
        window.logErrorOnce(
          `The calculation for ${dataType}.${target} gives more than one row the altinnRowId ${rowId}`,
        );
        return;
      }
      seenRowIds.add(rowId);
    }
    resultRowIds.push(rowId);
  }
  if (seenRowIds.size > 0 && seenRowIds.size < rows.length) {
    window.logErrorOnce(
      `The calculation for ${dataType}.${target} gives a list where some rows have an altinnRowId and some do not. ` +
        'Rows are merged by id when all of them have one, and by position when none has.',
    );
    return;
  }
  const [schema] = lookupTool.getSchemaForPath(target);
  const [itemSchema] = lookupTool.getSchemaForPath(`${target}[0]`);
  if (!schema || !hasType(schema, 'array') || !itemSchema || !hasType(itemSchema, 'object')) {
    window.logWarnOnce(`Could not convert calculation result for ${dataType}.${target}`);
    return;
  }

  const existing = dot.pick(target, model.currentData);
  const current: unknown[] = Array.isArray(existing) ? existing : [];
  const currentIndexById = new Map<string, number>();
  for (const [index, row] of current.entries()) {
    const rowId = isObject(row) ? asRowId(row[ALTINN_ROW_ID]) : undefined;
    if (rowId !== undefined && !currentIndexById.has(rowId)) {
      currentIndexById.set(rowId, index);
    }
  }
  const sources = planRows(resultRowIds, current, currentIndexById);
  const arranged = sources.map((source, index) =>
    source === NEW_ROW ? { [ALTINN_ROW_ID]: resultRowIds[index] ?? uuidv4() } : current[source],
  );
  if (Array.isArray(existing)) {
    // dot-object refuses to replace a list that has rows
    existing.splice(0, existing.length, ...arranged);
  } else {
    dot.str(target, arranged, model.currentData);
  }
  for (const [index, row] of rows.entries()) {
    mergeObject(`${target}[${index}]`, row as Record<string, unknown>, context);
  }
}

/** The source of a result row that does not merge into a current row */
const NEW_ROW = -1;

/**
 * Finds the current row each result row merges into, or NEW_ROW: by id when the rows have one, and by position when
 * they do not
 */
function planRows(
  resultRowIds: (string | undefined)[],
  current: unknown[],
  currentIndexById: Map<string, number>,
): number[] {
  return resultRowIds.map((rowId, index) => {
    if (rowId !== undefined) {
      return currentIndexById.get(rowId) ?? NEW_ROW;
    }
    return index < current.length && isObject(current[index]) ? index : NEW_ROW;
  });
}

/** Calculations read and write the same draft so later expressions see earlier results. */
export function runCalculations(
  state: FormStoreState,
  dataSources: ExpressionDataSources,
  isWritable: (dataElementId: string | null) => boolean,
) {
  if (state.readOnly) {
    return;
  }
  for (const [dataType, model] of Object.entries(state.data.models)) {
    const bootstrap = state.bootstrap.dataModels[dataType];
    if (!bootstrap.calculationConfig || !isWritable(model.dataElementId)) {
      continue;
    }
    for (const calculation of bootstrap.calculationConfig.calculations) {
      for (const target of resolveCalculationTargets(
        calculation.field,
        model.currentData,
        bootstrap.schemaResult.lookupTool,
      )) {
        const reference: IDataModelReference = { dataType, field: target };
        const runtime: ExpressionDataSources = {
          ...dataSources,
          currentDataModelPath: reference,
          context: { ...dataSources.context, currentDataModelPath: () => reference },
          formData: {
            defaultDataType: () => dataType,
            hasDataType: (type) => type in state.data.models,
            read: (ref) => dot.pick(ref.field, state.data.models[ref.dataType]?.currentData),
            getSchemaLookupTool: (type) => state.bootstrap.dataModels[type]?.schemaResult.lookupTool,
          },
          layout: { getLookups: () => state.bootstrap.layoutLookups },
          options: { getStaticOptions: (id) => state.bootstrap.staticOptions[id]?.options },
        };
        // An evaluation error must leave the previous value intact. Null is a valid calculation result.
        const result = evalExpr(calculation.expression, runtime, {
          returnType: ExprVal.Any,
          defaultValue: undefined,
          positionalArguments: [target],
          errorIntroText: `Calculation for ${dataType}.${target} failed`,
        });
        if (result === undefined) {
          continue;
        }
        writeCalculationResult(target, result, {
          dataType,
          model,
          lookupTool: bootstrap.schemaResult.lookupTool,
        });
      }
    }
  }
}
