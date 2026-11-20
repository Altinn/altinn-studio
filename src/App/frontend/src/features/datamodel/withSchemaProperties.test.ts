import type { JSONSchema7 } from 'json-schema';

import { SchemaLookupTool } from 'src/features/datamodel/SchemaLookupTool';
import { withSchemaProperties } from 'src/features/datamodel/withSchemaProperties';

const schema: JSONSchema7 = {
  type: 'object',
  properties: {
    text: { type: 'string' },
    object: { $ref: '#/definitions/Object' },
    rows: { type: 'array', items: { $ref: '#/definitions/Row' } },
    numbers: { type: 'array', items: { type: 'number' } },
  },
  definitions: {
    Object: {
      type: 'object',
      properties: { text: { type: 'string' }, nested: { $ref: '#/definitions/Nested' } },
    },
    Nested: { type: 'object', properties: { decimal: { type: 'number' } } },
    Row: {
      type: 'object',
      properties: {
        text: { type: 'string' },
        children: { type: 'array', items: { $ref: '#/definitions/Nested' } },
      },
    },
  },
};

describe('withSchemaProperties', () => {
  const lookupTool = new SchemaLookupTool(schema, '');

  it('adds the properties the schema knows as null, recursively, and keeps the others', () => {
    const object = { nested: {}, unknown: 1 };
    expect(withSchemaProperties(object, 'object', lookupTool)).toEqual({
      text: null,
      nested: { decimal: null },
      unknown: 1,
    });
    expect(object).toEqual({ nested: {}, unknown: 1 });
  });

  it('fills rows and nested rows, but never adds an altinnRowId', () => {
    const rows = [{ altinnRowId: 'a', children: [{}] }, { text: 'b' }];
    expect(withSchemaProperties(rows, 'rows', lookupTool)).toEqual([
      { altinnRowId: 'a', text: null, children: [{ decimal: null }] },
      { text: 'b', children: null },
    ]);
    expect(withSchemaProperties(rows[0], 'rows[0]', lookupTool)).toEqual({
      altinnRowId: 'a',
      text: null,
      children: [{ decimal: null }],
    });
  });

  it('leaves values alone that need nothing, and gives the same result for the same input', () => {
    const numbers = [1, 2];
    expect(withSchemaProperties(numbers, 'numbers', lookupTool)).toBe(numbers);
    const complete = { text: 'a', nested: { decimal: 1 } };
    expect(withSchemaProperties(complete, 'object', lookupTool)).toBe(complete);
    const partial = { text: 'a' };
    expect(withSchemaProperties(partial, 'object', lookupTool)).toBe(
      withSchemaProperties(partial, 'object', lookupTool),
    );
    expect(withSchemaProperties({ a: 1 }, 'unknown', lookupTool)).toEqual({ a: 1 });
  });
});
