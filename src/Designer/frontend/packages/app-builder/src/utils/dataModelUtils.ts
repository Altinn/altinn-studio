import type { JsonSchema } from 'app-shared/types/JsonSchema';
import type { DataModelMetadataJson } from 'app-shared/types/DataModelMetadata';

/**
 * Data model access for the app builder. This version handles schemas whose fields sit directly on
 * the root object, which is what Studio creates for a new app. Hand-written schemas with nested
 * definitions are a later step.
 */

export function findModelPath(
  dataModels: DataModelMetadataJson[] | undefined,
  dataType: string | undefined,
): string | undefined {
  if (!dataType) return undefined;
  return dataModels?.find(({ fileName }) => fileName === `${dataType}.schema.json`)
    ?.repositoryRelativeUrl;
}

export function getFieldNames(schema: JsonSchema | undefined): string[] {
  return Object.keys(getRootProperties(schema));
}

export function getField(
  schema: JsonSchema | undefined,
  fieldName: string,
): JsonSchema | undefined {
  const field = getRootProperties(schema)[fieldName];
  return typeof field === 'object' && field !== null ? (field as JsonSchema) : undefined;
}

/** Adds the field, or replaces it if it exists. */
export function setField(schema: JsonSchema, fieldName: string, field: JsonSchema): JsonSchema {
  return { ...schema, properties: { ...getRootProperties(schema), [fieldName]: field } };
}

function getRootProperties(schema: JsonSchema | undefined): Record<string, unknown> {
  const properties = schema?.properties;
  return typeof properties === 'object' && properties !== null ? properties : {};
}

/** Removes fields from the root object, and from the list of required fields. */
export function removeFields(schema: JsonSchema, fieldNames: string[]): JsonSchema {
  const properties = Object.fromEntries(
    Object.entries(getRootProperties(schema)).filter(([name]) => !fieldNames.includes(name)),
  );
  const updatedSchema: JsonSchema = { ...schema, properties };
  if (Array.isArray(schema.required)) {
    updatedSchema.required = schema.required.filter((name: string) => !fieldNames.includes(name));
  }
  return updatedSchema;
}
