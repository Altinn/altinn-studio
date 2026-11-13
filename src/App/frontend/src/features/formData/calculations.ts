import dot from 'dot-object';
import deepEqual from 'fast-deep-equal';
import { v4 as uuidv4 } from 'uuid';
import type { IDataModelReference } from '@app/layout-contract/generated/common.generated';
import type { JSONSchema7 } from 'json-schema';

import { evalExpr } from 'src/features/expressions';
import { ExprVal } from 'src/features/expressions/types';
import { ExprValidation } from 'src/features/expressions/validation';
import { convertData } from 'src/features/formData/convertData';
import { ALTINN_ROW_ID } from 'src/features/formData/types';
import type { SchemaLookupTool } from 'src/features/datamodel/SchemaLookupTool';
import type { ExpressionDataSources } from 'src/features/expressions/runtime/useExpressionDataSources';
import type { ExprValToActualOrExpr } from 'src/features/expressions/types';
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
    if (
      typeof field === 'string' &&
      field.trim() !== '' &&
      expression !== undefined &&
      ExprValidation.isValidOrScalar(expression, ExprVal.Any, `Invalid calculation for ${name}`)
    ) {
      calculations.push({ field, expression });
    } else {
      window.logWarn(`Skipping invalid calculation for ${name}`);
    }
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

function isListOfObjects(value: unknown): value is Record<string, unknown>[] {
  return Array.isArray(value) && value.length > 0 && value.every(isObject);
}

/** Converts the values that replace the target as a whole: scalars, null and lists of primitives. */
function convertCalculationResult(
  result: unknown,
  target: string,
  lookupTool: SchemaLookupTool,
): { value: FDValue; error: false } | { error: true } {
  const [schema] = lookupTool.getSchemaForPath(target, result === null);
  if (!schema) {
    return { error: true };
  }
  if (result === null) {
    // Backend reference types accept null, but non-nullable numeric and boolean value types do not.
    const allowsNull =
      hasType(schema, 'null') ||
      hasType(schema, 'string') ||
      hasType(schema, 'array') ||
      hasType(schema, 'object') ||
      [...(schema.anyOf ?? []), ...(schema.oneOf ?? [])].some(
        (alternative) => typeof alternative === 'object' && hasType(alternative, 'null'),
      );
    return allowsNull ? { value: null, error: false } : { error: true };
  }
  if (Array.isArray(result) && hasType(schema, 'array')) {
    const values: FDValue[] = [];
    for (const [index, item] of result.entries()) {
      const converted = convertCalculationResult(item, `${target}[${index}]`, lookupTool);
      if (converted.error) {
        return converted;
      }
      values.push(converted.value);
    }
    return { value: values, error: false };
  }
  if (typeof result === 'string' || typeof result === 'number' || typeof result === 'boolean') {
    const converted = convertData(result, schema);
    return converted.error ? { error: true } : { value: converted.newValue, error: false };
  }
  return { error: true };
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
  const converted = convertCalculationResult(result, target, lookupTool);
  if (converted.error) {
    window.logWarnOnce(`Could not convert calculation result for ${dataType}.${target}`);
    return;
  }
  if (converted.value === null) {
    dot.delete(target, model.currentData);
    dot.delete(target, model.invalidCurrentData);
    return;
  }
  if (!deepEqual(dot.pick(target, model.currentData), converted.value)) {
    dot.str(target, converted.value, model.currentData);
  }
  dot.delete(target, model.invalidCurrentData);
}

function mergeObject(target: string, result: Record<string, unknown>, context: CalculationTarget) {
  for (const [key, value] of Object.entries(result)) {
    // The row id is not in the schema. A row copied from another group brings its own, and keeps it.
    if (key === ALTINN_ROW_ID) {
      if (typeof value === 'string' && value.length > 0) {
        dot.str(`${target}.${key}`, value, context.model.currentData);
      }
      continue;
    }
    writeCalculationResult(`${target}.${key}`, value, context);
  }
}

function mergeRows(target: string, rows: Record<string, unknown>[], context: CalculationTarget) {
  const { dataType, model, lookupTool } = context;
  const [schema] = lookupTool.getSchemaForPath(target);
  const [itemSchema] = lookupTool.getSchemaForPath(`${target}[0]`);
  if (!schema || !hasType(schema, 'array') || !itemSchema || !hasType(itemSchema, 'object')) {
    window.logWarnOnce(`Could not convert calculation result for ${dataType}.${target}`);
    return;
  }
  if (!Array.isArray(dot.pick(target, model.currentData))) {
    dot.str(target, [], model.currentData);
  }
  const current: unknown[] = dot.pick(target, model.currentData);
  for (const [index, row] of rows.entries()) {
    if (!isObject(current[index])) {
      const newRow = { [ALTINN_ROW_ID]: uuidv4() };
      if (index < current.length) {
        current[index] = newRow;
      } else {
        current.push(newRow);
      }
    }
    mergeObject(`${target}[${index}]`, row, context);
  }
  if (current.length > rows.length) {
    current.splice(rows.length);
  }

  // Rows that bring their own id can collide, such as a row listed twice. Rows are matched by id when saving, so
  // the calculation fails rather than produce a list that cannot be told apart.
  const rowIds = new Set<string>();
  for (const row of current) {
    const rowId = isObject(row) ? row[ALTINN_ROW_ID] : undefined;
    if (typeof rowId === 'string' && rowId.length > 0) {
      if (rowIds.has(rowId)) {
        throw new Error(`The calculation for ${dataType}.${target} gives more than one row the altinnRowId ${rowId}`);
      }
      rowIds.add(rowId);
    }
  }
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
