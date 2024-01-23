import axios from 'axios';
import jsonpointer from 'jsonpointer';

const getLayoutSchema = async () => {
  const response = await axios.get(
    'https://altinncdn.no/schemas/json/layout/layout.schema.v1.json',
  );
  return response.data;
};

const writeToFile = (name: string, data: any) => {
  const fileName = `schemas/${name}.schema.v1.json`;
  const fs = require('fs');
  // check if directory exists
  if (!fs.existsSync('schemas')) {
    fs.mkdirSync('schemas');
  }
  fs.writeFile(fileName, JSON.stringify(data), function (err: any) {
    if (err) return console.log(err);
    console.log(`Wrote ${fileName}`);
  });
};

const expandAllOf = (schema: any, layoutSchema: any) => {
  const expandedSchema: any = {};
  schema.allOf?.slice(0, -1).forEach((item: any) => {
    if (item.$ref) {
      const ref = jsonpointer.get(layoutSchema, item.$ref.replace('#/', '/'));
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
        console.log('ref: ', ref);
        ref = expandAllOf(ref, layoutSchema);
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
  for (const property in schema.properties) {
    if (
      schema.properties[property].$ref &&
      !schema.properties[property].$ref.startsWith('expression.schema')
    ) {
      schema.properties[property] = expandRef(schema.properties[property].$ref, layoutSchema);
    }
    if (schema.properties[property].items?.$ref) {
      schema.properties[property].items = expandRef(
        schema.properties[property].items.$ref,
        layoutSchema,
      );
    }
    ensureStringTypeWithEnums(schema.properties[property]);
  }
  schema.title = `${name} component schema`;
  return schema;
};

const run = async () => {
  const layoutSchema: any = await getLayoutSchema();
  const allComponents = layoutSchema.definitions.AnyComponent.properties.type.enum;

  allComponents.forEach((componentName: string) => {
    const schema = generateComponentSchema(
      componentName === 'AddressComponent' ? 'Address' : componentName,
      layoutSchema,
    );
    writeToFile(componentName, schema);
  });
};

run();
