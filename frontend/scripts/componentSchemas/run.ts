import { expandAllOf, expandAnyOf, expandRefsInProperties, verifySchema } from './schemaUtils';
import type { AppFrontendVersion } from './version';
import { isValidVersion, versionSettings } from './version';
import { getLayoutSchema } from './api';

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

const generateComponentSchema = (name: string, layoutSchema: any) => {
  const definitionName = `Comp${name}`;
  console.log('definitionName: ', definitionName);
  const componentSchema = layoutSchema.definitions[definitionName];
  let schema: any = {
    $id: `https://altinncdn.no/schemas/json/component/${name}.schema.v1.json`,
    $schema: layoutSchema.$schema,
  };

  if (componentSchema.allOf) {
    schema = { ...schema, ...expandAllOf(componentSchema, layoutSchema) };

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
  schema.title = `${name} component schema`;
  return schema;
};

const run = async () => {
  let version: string = process.argv.length > 2 ? process.argv[2] : '';
  if (!isValidVersion(version)) {
    version = 'v4';
    console.warn(
      `Invalid version: ${version}. Please provide a valid version: v3 or v4. Defaulting to v4.`,
    );
  }
  const layoutSchema: any = await getLayoutSchema(version as AppFrontendVersion);
  const allComponents = layoutSchema.definitions.AnyComponent.properties.type.enum;

  allComponents.forEach((componentName: string) => {
    const schema = generateComponentSchema(
      componentName === 'AddressComponent' ? 'Address' : componentName,
      layoutSchema,
    );
    writeToFile(
      componentName === 'AddressComponent' ? 'Address' : componentName,
      schema,
      version as AppFrontendVersion,
    );
  });
};

run();
