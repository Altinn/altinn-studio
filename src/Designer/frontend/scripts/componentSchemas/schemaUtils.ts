import jsonpointer from 'jsonpointer';
import { sortTextResourceBindings } from './languageUtils';
import type {
  LayoutSchema,
  CondensedComponentSchema,
  ExpandedComponentSchema,
  AppFrontendVersion,
  ComponentName,
  PrefixedComponentName,
  AllOfDefinition,
} from './types';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';

export const allPropertyKeys: string[] = [];

export const generateComponentSchema = (
  componentName: ComponentName,
  layoutSchema: LayoutSchema,
  version: AppFrontendVersion,
): ExpandedComponentSchema => {
  const definitionName: PrefixedComponentName = `Comp${componentName}`;
  const condensedComponentSchema = getCondensedComponentSchema(
    definitionName,
    layoutSchema,
    version,
  );
  let newComponentSchema = initializeComponentSchema(componentName, layoutSchema);

  newComponentSchema = expandSchema(condensedComponentSchema, newComponentSchema, layoutSchema);
  sortSchemaTextResourceBindings(newComponentSchema);
  newComponentSchema.title = `${componentName} component schema`;

  return newComponentSchema as ExpandedComponentSchema;
};

export const getCondensedComponentSchema = (
  definitionName: PrefixedComponentName,
  layoutSchema: LayoutSchema,
  version: AppFrontendVersion,
): CondensedComponentSchema => {
  if (version === 'v4') {
    console.log('definitionName: ', definitionName + 'External');
    return expandRef(
      layoutSchema.definitions[definitionName].$ref,
      layoutSchema,
    ) as CondensedComponentSchema;
  }
  console.log('definitionName: ', definitionName);
  return layoutSchema.definitions[definitionName] as CondensedComponentSchema;
};

const initializeComponentSchema = (
  componentName: ComponentName,
  layoutSchema: LayoutSchema,
): Partial<ExpandedComponentSchema> => {
  return {
    $id: `https://altinncdn.no/schemas/json/component/${componentName}.schema.v1.json`,
    $schema: layoutSchema.$schema,
  };
};

const expandSchema = (
  condensedSchema: CondensedComponentSchema,
  expandedSchema: Partial<ExpandedComponentSchema>,
  layoutSchema: LayoutSchema,
): Partial<ExpandedComponentSchema> => {
  if ('allOf' in condensedSchema) {
    expandedSchema = { ...expandedSchema, ...expandAllOf(condensedSchema, layoutSchema) };

    const expectedProperties = getExpectedProperties(condensedSchema);
    allPropertyKeys.push(...expectedProperties);

    if (!verifySchema(expandedSchema, expectedProperties)) {
      return null;
    }

    // expandAnyOf does not work on top level in the current configuration.
    // It seems to only apply to the Group component in frontend v3, which we may not maintain much longer.
    // https://github.com/Altinn/altinn-studio/issues/13785
  } else if ('anyOf' in condensedSchema) {
    // newSchema.anyOf = expandAnyOf(condensedSchema, layoutSchema);
  }

  expandedSchema.properties = expandRefsInProperties(expandedSchema.properties, layoutSchema);

  return expandedSchema;
};

const getExpectedProperties = (schema: AllOfDefinition) => {
  return Object.keys(schema.allOf[schema.allOf.length - 1].properties);
};

const sortSchemaTextResourceBindings = (schema: Partial<ExpandedComponentSchema>) => {
  if (schema.properties?.textResourceBindings) {
    schema.properties.textResourceBindings.properties = sortTextResourceBindings(
      schema.properties.textResourceBindings.properties,
    );
  }
};

/**
 * Expands allOf node in schema by combining all properties together in one object.
 * For root component node, the last item in the allOf node is the list of expected
 * properties for the component. This is omitted in the expanded schema, but used to verify
 * that the expanded schema contains all expected properties.
 * @param node The node to expand
 * @param layoutSchema The full layout schema
 * @param componentNode Boolean indicating if the schema is for a root component node
 * @returns The expanded schema
 */
export const expandAllOf = (
  node: KeyValuePairs,
  layoutSchema: LayoutSchema,
  componentNode: boolean = true,
): KeyValuePairs => {
  const expandedSchema: Partial<ExpandedComponentSchema> = {};
  const allOfList = componentNode ? node.allOf?.slice(0, -1) : node.allOf;
  allOfList.forEach((item: KeyValuePairs) => {
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
  expandedSchema.required = node.allOf?.[node.allOf.length - 1].required;
  return expandedSchema;
};

/**
 * Expands anyOf node in schema by expanding all $refs and/or allOf nodes within the anyOf node.
 * @param node The node to expand
 * @param layoutSchema The full layout schema
 * @returns The expanded schema
 */
export const expandAnyOf = (node: KeyValuePairs, layoutSchema: LayoutSchema): KeyValuePairs => {
  const anyOf = [];
  node.anyOf?.forEach((item: KeyValuePairs) => {
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
 * Expands a ref in a schema from a reference to the actual schema
 * @param ref The ref to expand
 * @param layoutSchema The full layout schema
 * @returns The expanded schema
 */
export const expandRef = (ref: `#/${string}`, layoutSchema: LayoutSchema): KeyValuePairs => {
  return jsonpointer.get(layoutSchema, ref.replace('#/', '/'));
};

/**
 * Expands all refs in properties in a schema
 * @param properties The properties to expand
 * @param layoutSchema The full layout schema
 * @returns The expanded properties
 */
export const expandRefsInProperties = (
  properties: KeyValuePairs,
  layoutSchema: LayoutSchema,
): KeyValuePairs => {
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

/**
 * Verifies that a schema has all expected properties
 * @param schema The schema to verify
 * @param expectedProperties The list of expected properties
 * @returns Boolean indicating if the schema has all expected properties
 */
export const verifySchema = (
  schema: Partial<ExpandedComponentSchema>,
  expectedProperties: string[],
) => {
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
export const ensureTypeWithEnums = (schema: KeyValuePairs) => {
  if (schema.enum && schema.enum.length > 0) {
    setTypeFromEnum(schema);
  } else if (schema.items?.enum && schema.items.enum.length > 0) {
    setTypeFromEnum(schema.items);
  }
};

const setTypeFromEnum = (schema: KeyValuePairs) => {
  const inferredType = inferTypeFromEnum(schema.enum);
  if (inferredType) {
    schema.type = inferredType;
  }
};

const inferTypeFromEnum = (enumValues: string[] | number[]) => {
  const firstEnumValue = enumValues[0];
  if (typeof firstEnumValue === 'string') {
    return 'string';
  } else if (typeof firstEnumValue === 'number') {
    return 'number';
  }
  return undefined;
};
