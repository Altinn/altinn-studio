import jsonpointer from 'jsonpointer';
import { sortTextResourceBindings } from './languageUtils';

export const generateComponentSchema = (
  componentName: string,
  layoutSchema: any,
  version: string,
) => {
  const definitionName = `Comp${componentName}`;
  const componentSchema = getComponentSchema(definitionName, layoutSchema, version);

  let schema: any = {
    $id: `https://altinncdn.no/schemas/json/component/${componentName}.schema.v1.json`,
    $schema: layoutSchema.$schema,
  };

  if (componentSchema.allOf) {
    schema = { ...schema, ...expandAllOf(componentSchema, layoutSchema) };
    const expectedProperties = Object.keys(
      componentSchema.allOf[componentSchema.allOf.length - 1].properties,
    );
    pushPropertyKeys(expectedProperties);

    if (!verifySchema(schema, expectedProperties)) {
      return null;
    }
  } else if (componentSchema.anyOf) {
    schema.anyOf = expandAnyOf(componentSchema, layoutSchema);
  }

  // Expand all refs in properties
  schema.properties = expandRefsInProperties(schema.properties, layoutSchema);

  // Sort text resource binding keys
  if (schema.properties?.textResourceBindings) {
    schema.properties.textResourceBindings.properties = sortTextResourceBindings(
      schema.properties.textResourceBindings.properties,
    );
  }

  schema.title = `${componentName} component schema`;
  return schema;
};

export const getComponentSchema = (definitionName: string, layoutSchema: any, version: string) => {
  if (version === 'v4') {
    console.log('definitionName: ', definitionName + 'External');
    return expandRef(layoutSchema.definitions[definitionName].$ref, layoutSchema);
  }
  console.log('definitionName: ', definitionName);
  return layoutSchema.definitions[definitionName];
};

/**
 * Expands allOf node in schema by combining all properties together in one object.
 * For root component node, the last item in the allOf node is the list of expected
 * properties for the component. This is omitted in the expanded schema, but used to verify
 * that the expanded schema contains all expected properties.
 * @param schema The schema to expand
 * @param layoutSchema The full layout schema
 * @param componentNode Boolean indicating if the schema is for a root component node
 * @returns The expanded schema
 */
export const expandAllOf = (schema: any, layoutSchema: any, componentNode: boolean = true) => {
  const expandedSchema: any = {};
  const allOfList = componentNode ? schema.allOf?.slice(0, -1) : schema.allOf;
  allOfList.forEach((item: any) => {
    if (item.$ref) {
      let ref = expandRef(item.$ref, layoutSchema);

      if (ref.allOf) {
        ref = expandAllOf(ref, layoutSchema, false);
      }
      expandedSchema.properties = { ...expandedSchema.properties, ...ref.properties };
    } else if (item.properties) {
      expandedSchema.properties = { ...expandedSchema.properties, ...item.properties };
    }
  });
  expandedSchema.required = schema.allOf?.[schema.allOf.length - 1].required;
  return expandedSchema;
};

/**
 * Expands a ref in a schema from a reference to the actual schema
 * @param ref The ref to expand
 * @param layoutSchema The full layout schema
 * @returns The expanded schema
 */
export const expandRef = (ref: string, layoutSchema: any) => {
  return jsonpointer.get(layoutSchema, ref.replace('#/', '/'));
};

/**
 * Expands anyOf node in schema by expanding all $refs and/or allOf nodes within the anyOf node.
 * @param schema The schema to expand
 * @param layoutSchema The full layout schema
 * @returns The expanded schema
 */
export const expandAnyOf = (schema: any, layoutSchema: any) => {
  const anyOf = [];
  schema.anyOf?.forEach((item: any) => {
    if (item.$ref) {
      let ref = jsonpointer.get(layoutSchema, item.$ref.replace('#/', '/'));
      if (ref.allOf) {
        ref = expandAllOf(ref, layoutSchema, false);
      }
      anyOf.push(ref);
    } else {
      anyOf.push(item);
    }
  });
  return anyOf;
};

/**
 * Expands all refs in properties in a schema
 * @param properties The properties to expand
 * @param layoutSchema The full layout schema
 * @returns The expanded properties
 */
export const expandRefsInProperties = (properties: any, layoutSchema: any) => {
  const expandedProperties = { ...properties };
  for (const property in properties) {
    if (expandedProperties[property].$ref && expandedProperties[property].$ref.startsWith('#/')) {
      expandedProperties[property] = expandRef(expandedProperties[property].$ref, layoutSchema);
    }
    if (expandedProperties[property].items?.$ref) {
      expandedProperties[property].items = expandRef(
        expandedProperties[property].items.$ref,
        layoutSchema,
      );
    }
    if (expandedProperties[property].allOf) {
      expandedProperties[property] = expandAllOf(expandedProperties[property], layoutSchema);
    }

    if (expandedProperties[property].anyOf) {
      expandedProperties[property].anyOf = expandAnyOf(expandedProperties[property], layoutSchema);
    }
    ensureTypeWithEnums(expandedProperties[property]);
  }

  return expandedProperties;
};

export const allPropertyKeys = [];

const pushPropertyKeys = (propertyKeys: string[]) => {
  allPropertyKeys.push(...propertyKeys);
};

/**
 * Verifies that a schema has all expected properties
 * @param schema The schema to verify
 * @param expectedProperties The list of expected properties
 * @returns Boolean indicating if the schema has all expected properties
 */
export const verifySchema = (schema: any, expectedProperties: string[]) => {
  const schemaProperties = Object.keys(schema.properties);
  const missingProperties = expectedProperties.filter(
    (property) => !schemaProperties.includes(property),
  );
  if (missingProperties.length > 0) {
    console.log(`Missing properties: ${missingProperties.join(', ')}`);
    return false;
  }
  return true;
};

/**
 * Ensures that a schema with enum values has correct type (string or number)
 * @param schema The schema to ensure type for
 */
export const ensureTypeWithEnums = (schema: any) => {
  if (schema.enum && schema.enum.length > 0) {
    const firstEnumValue = schema.enum[0];
    if (typeof firstEnumValue === 'string') {
      schema.type = 'string';
    } else if (typeof firstEnumValue === 'number') {
      schema.type = 'number';
    }
  } else if (schema.items?.enum && schema.items.enum.length > 0) {
    const firstEnumValue = schema.items.enum[0];
    if (typeof firstEnumValue === 'string') {
      schema.items.type = 'string';
    } else if (typeof firstEnumValue === 'number') {
      schema.items.type = 'number';
    }
  }
};
