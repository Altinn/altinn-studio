import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import fs from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import type { AnySchemaObject } from 'ajv';

// Keywords whose values are instance data, not schemas
const dataKeywords = new Set(['default', 'examples', 'enum', 'const']);

function toPointerSegment(key: string) {
  return encodeURIComponent(key.replace(/~/g, '~0').replace(/\//g, '~1'));
}

/**
 * Finds every 'default' keyword in a schema, with a JSON pointer to the (sub)schema it belongs to.
 */
function findDefaults(
  node: unknown,
  pointer = '',
  found: { pointer: string; value: unknown }[] = [],
) {
  if (!node || typeof node !== 'object') {
    return found;
  }
  if ('default' in node) {
    found.push({ pointer, value: node.default });
  }
  for (const [key, child] of Object.entries(node)) {
    const childPointer = `${pointer}/${toPointerSegment(key)}`;
    if (key === 'properties' && child && typeof child === 'object') {
      // Skip the properties object itself, where a property named 'default' is not the 'default' keyword
      for (const [name, schema] of Object.entries(child)) {
        findDefaults(schema, `${childPointer}/${toPointerSegment(name)}`, found);
      }
    } else if (!dataKeywords.has(key)) {
      findDefaults(child, childPointer, found);
    }
  }
  return found;
}

const schemaRoot = path.resolve(import.meta.dirname, '../schemas');
const files = fs
  .readdirSync(schemaRoot, { recursive: true, encoding: 'utf8' })
  .filter((file) => file.endsWith('.json'))
  .sort();
const schemas = files.map((file) => ({
  file,
  schema: JSON.parse(fs.readFileSync(path.join(schemaRoot, file), 'utf-8')) as AnySchemaObject,
}));

describe('published schemas', () => {
  const ajv = new Ajv({ strict: false });
  addFormats(ajv);

  beforeAll(() => {
    ajv.addSchema(schemas.map(({ schema }) => schema));
  });

  it('discovers JSON schemas in the contract', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(schemas)('$file is a valid schema with resolvable references', ({ schema }) => {
    expect(typeof schema.$id).toBe('string');
    expect(ajv.validateSchema(schema)).toBe(true);
    expect(() => ajv.compile(schema)).not.toThrow();
  });

  it('default values are valid according to their own schemas', () => {
    const invalidDefaults = schemas.flatMap(({ schema }) =>
      findDefaults(schema)
        .map(({ pointer, value }) => {
          const validate = ajv.getSchema(`${schema.$id}#${pointer}`);
          return validate?.(value)
            ? undefined
            : { schema: schema.$id, pointer, value, errors: validate?.errors };
        })
        .filter((invalidDefault) => invalidDefault !== undefined),
    );
    expect(invalidDefaults).toEqual([]);
  });
});
