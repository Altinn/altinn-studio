import { describe, expect, it } from 'vitest';
import type { JsonSchema } from 'app-shared/types/JsonSchema';
import type { DataModelMetadataJson } from 'app-shared/types/DataModelMetadata';
import { addTextField, findModelPath, getFieldNames, removeFields } from './dataModelUtils';

const schema: JsonSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  type: 'object',
  properties: { property1: { type: 'string' } },
  required: ['property1'],
};

describe('findModelPath', () => {
  const dataModels = [
    { fileName: 'model.schema.json', repositoryRelativeUrl: '/App/models/model.schema.json' },
  ] as DataModelMetadataJson[];

  it('returns the path of the schema for the data type', () => {
    expect(findModelPath(dataModels, 'model')).toBe('/App/models/model.schema.json');
  });

  it('returns undefined when there is no data type or no matching schema', () => {
    expect(findModelPath(dataModels, undefined)).toBeUndefined();
    expect(findModelPath(dataModels, 'other')).toBeUndefined();
  });
});

describe('addTextField', () => {
  it('adds a string field and keeps the rest of the schema', () => {
    const updatedSchema = addTextField(schema, 'fornavn');
    expect(getFieldNames(updatedSchema)).toEqual(['property1', 'fornavn']);
    expect(updatedSchema.properties.fornavn).toEqual({ type: 'string' });
    expect(updatedSchema.required).toEqual(['property1']);
    expect(updatedSchema.$schema).toBe(schema.$schema);
  });

  it('does not change the original schema', () => {
    addTextField(schema, 'fornavn');
    expect(getFieldNames(schema)).toEqual(['property1']);
  });
});

describe('removeFields', () => {
  it('removes the fields and their required entries, and keeps the rest', () => {
    const fullSchema: JsonSchema = {
      ...schema,
      properties: { property1: { type: 'string' }, fornavn: { type: 'string' } },
      required: ['property1', 'fornavn'],
    };
    const updatedSchema = removeFields(fullSchema, ['fornavn']);
    expect(getFieldNames(updatedSchema)).toEqual(['property1']);
    expect(updatedSchema.required).toEqual(['property1']);
    expect(updatedSchema.$schema).toBe(schema.$schema);
  });
});
