import axios from 'axios';
import jsonpointer from 'jsonpointer';

const versionSettings = {
  v3: {
    layoutSchemaUrl: 'https://altinncdn.no/schemas/json/layout/layout.schema.v1.json',
    componentSchemaPath: '../../packages/ux-editor-v3/src/testing/schemas/json/component',
  },
  v4: {
    layoutSchemaUrl:
      'https://altinncdn.no/toolkits/altinn-app-frontend/4.0.0-rc2/schemas/json/layout/layout.schema.v1.json',
    componentSchemaPath: '../../packages/ux-editor/src/testing/schemas/json/component',
  },
};
const validVersions = ['v3', 'v4'] as const;
type AppFrontendVersion = (typeof validVersions)[number];

const isValidVersion = (version: string): boolean => {
  return validVersions.includes(version as AppFrontendVersion);
};

const getLayoutSchema = async (version?: AppFrontendVersion) => {
  const response = await axios.get(versionSettings[version || 'v4'].layoutSchemaUrl);
  return response?.data;
};

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

const expandAllOf = (schema: any, layoutSchema: any, componentNode: boolean = true) => {
  const expandedSchema: any = {};
  const allOfList = componentNode ? schema.allOf?.slice(0, -1) : schema.allOf;
  allOfList.forEach((item: any) => {
    if (item.$ref) {
      let ref = jsonpointer.get(layoutSchema, item.$ref.replace('#/', '/'));

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

const expandAnyOf = (schema: any, layoutSchema: any) => {
  const anyOf = [];
  schema.anyOf?.forEach((item: any) => {
    if (item.$ref) {
      let ref = jsonpointer.get(layoutSchema, item.$ref.replace('#/', '/'));
      if (ref.allOf) {
        ref = expandAllOf(ref, layoutSchema, false);
      }
      anyOf.push(ref);
    } else if (item.properties) {
      anyOf.push(item);
    }
  });
  return anyOf;
};
const expandRef = (ref: string, layoutSchema: any) => {
  return jsonpointer.get(layoutSchema, ref.replace('#/', '/'));
};

const ensureStringTypeWithEnums = (schema: any) => {
  if (schema.enum) {
    schema.type = 'string';
  }
};

const verifySchema = (schema: any, expectedProperties: string[]) => {
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

const expandRefsInProperties = (properties: any, layoutSchema: any) => {
  const expandedProperties = { ...properties };
  for (const property in properties) {
    if (
      expandedProperties[property].$ref &&
      !expandedProperties[property].$ref.startsWith('expression.schema')
    ) {
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
    ensureStringTypeWithEnums(expandedProperties[property]);
  }

  return expandedProperties;
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
    writeToFile(componentName, schema, version as AppFrontendVersion);
  });
};

run();
