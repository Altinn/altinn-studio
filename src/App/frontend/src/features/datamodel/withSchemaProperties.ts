import type { SchemaLookupTool } from 'src/features/datamodel/SchemaLookupTool';

const cache = new WeakMap<SchemaLookupTool, WeakMap<object, Map<string, unknown>>>();

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Gives an object, or the objects in a list, every property the schema knows for them, as null when the data leaves
 * it out, recursively. That is the shape the backend reads from its C# model, and the shape the frontend has after a
 * save. Properties the schema does not know, such as altinnRowId, are kept as they are and never added. The input is
 * not changed, and the same input gives the same output object as long as the input object is the same.
 */
export function withSchemaProperties<T>(value: T, path: string, lookupTool: SchemaLookupTool): T {
  if (!value || typeof value !== 'object') {
    return value;
  }
  let byValue = cache.get(lookupTool);
  if (!byValue) {
    byValue = new WeakMap();
    cache.set(lookupTool, byValue);
  }
  let byPath = byValue.get(value);
  if (!byPath) {
    byPath = new Map();
    byValue.set(value, byPath);
  }
  if (byPath.has(path)) {
    return byPath.get(path) as T;
  }
  const result = fill(value, path, lookupTool);
  byPath.set(path, result);
  return result as T;
}

function fill(value: object, path: string, lookupTool: SchemaLookupTool): unknown {
  if (Array.isArray(value)) {
    let out: unknown[] | undefined;
    value.forEach((item, index) => {
      const filled = withSchemaProperties(item, `${path}[${index}]`, lookupTool);
      if (filled !== item) {
        out ??= [...value];
        out[index] = filled;
      }
    });
    return out ?? value;
  }
  if (!isObject(value)) {
    return value;
  }
  const [schema] = lookupTool.getSchemaForPath(path);
  if (!schema?.properties) {
    return value;
  }
  let out: Record<string, unknown> | undefined;
  for (const key of Object.keys(schema.properties)) {
    const child = value[key];
    const filled = child === undefined ? null : withSchemaProperties(child, `${path}.${key}`, lookupTool);
    if (filled !== child) {
      out ??= { ...value };
      out[key] = filled;
    }
  }
  return out ?? value;
}
