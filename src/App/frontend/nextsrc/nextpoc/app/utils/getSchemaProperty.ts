import type { JSONSchema7, JSONSchema7Definition } from 'json-schema';

// Extend JSONSchema7 for $defs usage (which is draft 2020-12, not 07)
export interface JSONSchema7WithDefs extends JSONSchema7 {
  $defs?: Record<string, JSONSchema7Definition>;
}

// Type guard: checks if a JSONSchema7Definition is a JSONSchema7 object (not a boolean or array)
function isJSONSchemaObject(def: JSONSchema7Definition): def is JSONSchema7 {
  return typeof def === 'object' && def !== null && !Array.isArray(def);
}

/**
 * Retrieves the schema definition for a given property name.
 *
 * - If it's an array type with a $ref in 'items', it returns the referenced definition from $defs.
 * - Otherwise, returns the property definition directly.
 */
export function getSchemaProperty(schema: JSONSchema7WithDefs, propertyName: string): JSONSchema7 | undefined {
  // 1. Find the property definition in schema.properties
  const propDef = schema.properties?.[propertyName];

  // If not found or is a boolean schema, return undefined
  if (!propDef || typeof propDef === 'boolean') {
    return undefined;
  }

  // 2. Check if it's an array type
  const isArrayType = propDef.type === 'array' || (Array.isArray(propDef.type) && propDef.type.includes('array'));

  // 3. If it's an array, see if 'items' is a single schema with a $ref
  if (isArrayType && propDef.items) {
    if (!Array.isArray(propDef.items) && isJSONSchemaObject(propDef.items)) {
      const refPath = propDef.items.$ref; // e.g. "#/$defs/MyDefinition"
      if (refPath) {
        const defName = refPath.split('/').pop();
        // Look up the referenced definition in $defs
        if (defName && schema.$defs) {
          const refSchema = schema.$defs[defName];
          // Return if it's a valid (non-boolean) schema
          if (refSchema && typeof refSchema !== 'boolean') {
            return refSchema;
          }
        }
        return undefined;
      }
    }
  }

  // 4. If not array-with-$ref, return the property definition itself
  return propDef;
}
