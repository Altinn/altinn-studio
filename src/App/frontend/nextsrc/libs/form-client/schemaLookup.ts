import type { JSONSchema7, JSONSchema7Definition } from 'json-schema';

/**
 * Resolves a dot-notation data model path (e.g., "repeatingGroup.points") to the
 * leaf JSON Schema node. Handles properties, array items, $ref, anyOf, and oneOf.
 */
export function lookupSchemaForPath(schema: JSONSchema7, path: string): JSONSchema7 | undefined {
  const segments = path.replace(/\[(\d+)]/g, '.$1').split('.');
  return resolveSegments(schema, segments, schema);
}

function resolveSegments(node: JSONSchema7, segments: string[], root: JSONSchema7): JSONSchema7 | undefined {
  if (segments.length === 0) {
    return node;
  }

  const resolved = resolveRef(node, root);
  if (!resolved) {
    return undefined;
  }

  const [segment, ...rest] = segments;

  // Skip numeric segments (array indices) — step into items instead
  if (/^\d+$/.test(segment)) {
    if (resolved.items && typeof resolved.items === 'object' && !Array.isArray(resolved.items)) {
      return resolveSegments(resolved.items as JSONSchema7, rest, root);
    }
    return undefined;
  }

  // Try properties
  if (resolved.properties?.[segment]) {
    const propSchema = resolved.properties[segment];
    if (typeof propSchema === 'boolean') {
      return undefined;
    }
    if (rest.length === 0) {
      return resolveRef(propSchema, root) ?? undefined;
    }
    return resolveSegments(propSchema, rest, root);
  }

  // Try items (for arrays where the path skips the index)
  if (resolved.type === 'array' && resolved.items && typeof resolved.items === 'object') {
    const items = resolved.items as JSONSchema7;
    return resolveSegments(items, segments, root);
  }

  // Try anyOf / oneOf
  for (const subSchemas of [resolved.anyOf, resolved.oneOf]) {
    if (subSchemas) {
      for (const sub of subSchemas) {
        if (typeof sub === 'boolean') {
          continue;
        }
        const result = resolveSegments(sub, segments, root);
        if (result) {
          return result;
        }
      }
    }
  }

  // Try allOf
  if (resolved.allOf) {
    for (const sub of resolved.allOf) {
      if (typeof sub === 'boolean') {
        continue;
      }
      const result = resolveSegments(sub, segments, root);
      if (result) {
        return result;
      }
    }
  }

  return undefined;
}

function resolveRef(node: JSONSchema7 | JSONSchema7Definition, root: JSONSchema7): JSONSchema7 | undefined {
  if (typeof node === 'boolean') {
    return undefined;
  }

  if (!node.$ref) {
    return node;
  }

  const ref = node.$ref;
  // Support #/$defs/Name and #/definitions/Name
  const match = ref.match(/^#\/(\$defs|definitions)\/(.+)$/);
  if (!match) {
    return undefined;
  }

  const defsKey = match[1] as '$defs' | 'definitions';
  const name = match[2];
  const defs = defsKey === '$defs' ? root.$defs : root.definitions;
  if (!defs?.[name]) {
    return undefined;
  }

  const resolved = defs[name];
  if (typeof resolved === 'boolean') {
    return undefined;
  }

  // Recursively resolve in case of chained refs
  return resolveRef(resolved, root);
}
