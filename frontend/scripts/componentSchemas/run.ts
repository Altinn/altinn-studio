import { expandAllOf, expandAnyOf, expandRefsInProperties, verifySchema } from './schemaUtils';
import type { AppFrontendVersion } from './version';
import { isValidVersion, versionSettings } from './version';
import { getLayoutSchema } from './api';
import { logComponentPropertyLabels, logTextResourceLabels } from './languageUtils';

const allTextResourceBindingKeys = [];
const allPropertyKeys = [];

const writeToFile = (name: string, data: any, version: AppFrontendVersion) => {
  const path = require('path');
  const fs = require('fs');

  const dirPath = path.resolve(__dirname, versionSettings[version].componentSchemaPath);
  const fileName = `${dirPath}/${name}.schema.v1.json`;

  fs.writeFile(fileName, JSON.stringify(data), function (err: any) {
    if (err) return console.log(err);
    console.log(`Wrote ${fileName}`);
  });
};

const addTextResourceBindingKeys = (schema: any) => {
  if (schema.properties?.textResourceBindings) {
    const textResourceBindingKeys = Object.keys(schema.properties.textResourceBindings.properties);
    allTextResourceBindingKeys.push(...textResourceBindingKeys);
  }
};

const addProperties = (propertyKeys: string[]) => {
  allPropertyKeys.push(...propertyKeys);
};

const generateComponentSchema = (name: string, layoutSchema: any) => {
  const definitionName = `Comp${name}`;
  console.log('definitionName: ', definitionName);
  const componentSchema = layoutSchema.definitions[definitionName];
  let schema: any = {
    $id: `https://altinncdn.no/schemas/json/component/${name}.schema.v1.json`, // These links respond with 404?
    $schema: layoutSchema.$schema,
  };

  // The v4 schema has external definitions. This code block is needed to fetch v4 properties correctly.
  const externalDefinitionName = definitionName + 'External';
  if (layoutSchema.definitions[externalDefinitionName]?.allOf) {
    componentSchema.allOf = layoutSchema.definitions[externalDefinitionName].allOf;
  }

  if (componentSchema.allOf) {
    schema = { ...schema, ...expandAllOf(componentSchema, layoutSchema) };
    const expectedProperties = Object.keys(
      componentSchema.allOf[componentSchema.allOf.length - 1].properties,
    );
    addProperties(expectedProperties);

    if (
      !verifySchema(
        schema,
        Object.keys(componentSchema.allOf[componentSchema.allOf.length - 1].properties),
      )
    ) {
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
  schema.title = `${name} component schema`;
  return schema;
};

const sortTextResourceBindings = (textResourceBindings: any) => {
  const { title, description, help, ...rest } = textResourceBindings;
  const sorted: any = {};
  if (title) {
    sorted.title = title;
  }
  if (description) {
    sorted.description = description;
  }
  if (help) {
    sorted.help = help;
  }
  return { ...sorted, ...rest };
};

const run = async () => {
  let version: string = process.argv.length > 2 ? process.argv[2] : '';
  if (!isValidVersion(version)) {
    console.warn(
      `Invalid version: ${version}. Please provide a valid version: v3 or v4. Defaulting to v4.`,
    );
    version = 'v4';
  }

  const layoutSchema: any = await getLayoutSchema(version as AppFrontendVersion);
  const allComponents = layoutSchema.definitions.AnyComponent.properties.type.enum;

  allComponents.forEach((componentName: string) => {
    componentName = componentName === 'AddressComponent' ? 'Address' : componentName;

    const schema = generateComponentSchema(componentName, layoutSchema);
    addTextResourceBindingKeys(schema);
    writeToFile(componentName, schema, version as AppFrontendVersion);
  });

  const uniqueTextResourceBindingKeys = [...new Set(allTextResourceBindingKeys)];
  logTextResourceLabels(uniqueTextResourceBindingKeys);
  console.log('--------------------------------------------------------');
  logComponentPropertyLabels([...new Set(allPropertyKeys)]);
};

run();
