import dot from 'dot-object';
import deepEqual from 'fast-deep-equal';
import type { IDataModelReference } from '@app/layout-contract/generated/common.generated';
import type { JSONSchema7 } from 'json-schema';

import { evalExpr } from 'src/features/expressions';
import { ExprVal } from 'src/features/expressions/types';
import { ExprValidation } from 'src/features/expressions/validation';
import { convertData } from 'src/features/formData/convertData';
import type { SchemaLookupTool } from 'src/features/datamodel/SchemaLookupTool';
import type { ExpressionDataSources } from 'src/features/expressions/runtime/useExpressionDataSources';
import type { ExprValToActualOrExpr } from 'src/features/expressions/types';
import type { FormStoreState } from 'src/features/form/FormContext';
import type { FDValue } from 'src/features/formData/FormDataWrite';

export interface CalculationConfig {
  calculations: Record<string, { expression: ExprValToActualOrExpr<ExprVal.Any> }>;
}

export function resolveCalculationConfig(config: unknown): CalculationConfig | null {
  if (!config || typeof config !== 'object' || !('calculations' in config)) {
    return null;
  }
  if (!config.calculations || typeof config.calculations !== 'object' || Array.isArray(config.calculations)) {
    return null;
  }
  const calculations: CalculationConfig['calculations'] = {};
  for (const [field, definition] of Object.entries(config.calculations)) {
    if (
      definition &&
      typeof definition === 'object' &&
      'expression' in definition &&
      definition.expression !== undefined &&
      ExprValidation.isValidOrScalar(definition.expression, ExprVal.Any, `Invalid calculation for ${field}`)
    ) {
      calculations[field] = { expression: definition.expression };
    } else {
      window.logWarn(`Skipping invalid calculation for ${field}`);
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
  if (typeof result === 'object' && hasType(schema, 'object')) {
    const value: Record<string, FDValue> = {};
    for (const [key, item] of Object.entries(result)) {
      const converted = convertCalculationResult(item, `${target}.${key}`, lookupTool);
      if (converted.error) {
        return converted;
      }
      value[key] = converted.value;
    }
    return { value, error: false };
  }
  if (typeof result === 'string' || typeof result === 'number' || typeof result === 'boolean') {
    const converted = convertData(result, schema);
    return converted.error ? { error: true } : { value: converted.newValue, error: false };
  }
  return { error: true };
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
    for (const [field, calculation] of Object.entries(bootstrap.calculationConfig.calculations)) {
      for (const target of resolveCalculationTargets(field, model.currentData, bootstrap.schemaResult.lookupTool)) {
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
        const converted = convertCalculationResult(result, target, bootstrap.schemaResult.lookupTool);
        if (converted.error) {
          window.logWarnOnce(`Could not convert calculation result for ${dataType}.${target}`);
          continue;
        }
        if (converted.value === null) {
          dot.delete(target, model.currentData);
          dot.delete(target, model.invalidCurrentData);
          continue;
        }
        if (!deepEqual(dot.pick(target, model.currentData), converted.value)) {
          dot.str(target, converted.value, model.currentData);
        }
        dot.delete(target, model.invalidCurrentData);
      }
    }
  }
}
