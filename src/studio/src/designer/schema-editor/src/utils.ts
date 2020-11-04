const JsonPointer = require('jsonpointer');

export function generateUiSchema(
  schema: any,
  mainSchema: any,
  path: string,
  uiPath: string,
) {
  const result: any[] = [];
  const required: string[] = schema.required || [];

  // Loop through all properties of root node
  Object.keys(schema.properties).forEach((key) => {
    let value: any;
    const refPath = schema.properties[key].$ref;
    if (refPath) {
      const subSchemaKey = refPath.replace('#/definitions/', '');
      value = generateUiSchemaFromRef(mainSchema, refPath, subSchemaKey, `${uiPath}/${subSchemaKey}`);
    } else if (typeof schema.properties[key] === 'object' && schema.properties[key] !== null) {
      value = generateUiSchemaFromType(schema.properties[key], `${path}/${key}`, `${uiPath}/${key}`);
    } else {
      value = schema.properties[key];
    }

    const uiItem: any = {
      id: key,
      schemaPath: `${path}/properties/${key}`,
      uiPath: `${uiPath}/${key}`,
      $ref: refPath,
      requiredPath: required.find((k) => k === key) ? `${path}/required` : undefined,
      value: value,
    };
    result.push(uiItem);
  });

  return result;
}

export function generateUiSchemaFromRef(
  mainSchema: any,
  ref: string,
  currentKey: string,
  uiPath: string,
) {
  const result: any[] = [];
  const schema: any = JsonPointer.get(mainSchema, ref.replace('#', ''));
  console.log(`Schema for ${currentKey}: `, schema);
  let value;
  if (schema.properties) {
    value = generateUiSchema(schema, mainSchema, ref.replace('#', ''), `${uiPath}/${currentKey}`);
  } else if (schema.$ref) {
    value = generateUiSchemaFromRef(mainSchema, schema.$ref, schema.$ref.replace('#/definitions/', ''), `${uiPath}/${currentKey}`);
  } else {
    value = generateUiSchemaFromType(schema, `${ref.replace('#', '')}`, `${uiPath}/${currentKey}`)
  }

  result.push({
    id: currentKey,
    schemaPath: `${ref.replace('#', '')}`,
    uiPath,
    value,
  });

  return result;
}

export function generateUiSchemaFromType(
  schema: any,
  schemaPath: string,
  uiPath: string,
) {
  return Object.keys(schema).map((key) => {
    return {
      id: key,
      schemaPath: `${schemaPath}/${key}`,
      uiPath,
      value: schema[key],
    };
  });
}

export function createDataArray(
  schema: any,
  schemaPath: string,
  uiPath: string,
  mainSchema?: any,
  requiredArray?: string[]
): any[] {
  const result: any[] = [];
  mainSchema = mainSchema || schema;
  let path = schemaPath.startsWith('#') ? schemaPath.substr(1) : schemaPath;
  const required = requiredArray || schema.required;
  Object.keys(schema).forEach((key) => {
    if (typeof schema[key] === 'object' && schema[key] !== null) {
      if (key === 'properties') {
        const propArray = createDataArray(
          schema[key], `${schemaPath}/${key}`, uiPath, mainSchema, required);
        propArray.forEach((property) => {
          result.push(property);
        })
      } else if (key !== 'definitions' && key !== 'required') {
        result.push({
          id: key,
          uiPath,
          schemaPath: path || '/',
          value: createDataArray(
            schema[key], `${schemaPath}/${key}`, `${uiPath}/${key}`, mainSchema),
          $ref: schema[key].$ref || undefined,
          requiredPath: required && required.find((k: string) => k === key) ?
          schemaPath.replace('properties', 'required') : undefined,
        });
      }
    } else {
      if (key === '$ref') {
        const refPath = schema[key].startsWith('#') ? schema[key].substr(1) : schema[key];
        const subSchema = JsonPointer.get(mainSchema, refPath);
        const content = createDataArray(subSchema, schema[key], uiPath, mainSchema);
        result.push({
          id: schema.$ref.replace('#/definitions/', ''),
          displayText: `Type: ${schema.$ref.replace('#/definitions/', '')}`,
          uiPath,
          schemaPath: schema.$ref.replace('#', ''),
          $ref: subSchema.$ref,
          requiredPath: required && required.find((k: string) => k === key) ?
          schemaPath.replace('properties', 'required') : undefined,
          value: content,
        });
        // content.forEach((item) => {
        //   result.push(item);
        // });
      } else {
        result.push({
          id: key,
          uiPath,
          schemaPath: path || '/',
          value: schema[key],
        });
      }
    }
  });

  return result;
}

export function getUiSchemaItem(schema: any[], pathArray: string[], index: number): any {
  const pathSegment = pathArray[index];
  const item = schema.find((schemaItem) => schemaItem.id === pathSegment);
  if (item && Array.isArray(item.value) && index < pathArray.length - 1) {
    return getUiSchemaItem(item.value, pathArray, ++index);
  }

  return item;
}

export function buildJsonSchema(uiSchema: any[], result: any): any {
  uiSchema.forEach((item) => {
    console.log(item.id);
    const path = item.schemaPath.endsWith('/') ? `${item.schemaPath}${item.id}` : `${item.schemaPath}/${item.id}`;
    let itemToSet: any;
    if (item.$ref) {
      itemToSet = {
        $ref: item.$ref
      }
      JsonPointer.set(result, path, itemToSet);
    }

    if (item.requiredPath) {
      JsonPointer.set(result, `/${item.requiredPath.substr(1)}/-`, item.id);
    }

    if (Array.isArray(item.value)) {
      buildJsonSchema(item.value, result);
    } else {
      JsonPointer.set(result, path, item.value);
    }
  });
}

export function buildUISchema(schema: any, rootPath: string,) {
  const result : any[] = [];
  Object.keys(schema).forEach((key) => {
    const item = schema[key];
    const id = `${rootPath}/${key}`;
    if (item.properties) {
      result.push(buildUiSchemaForItemWithProperties(item, id));
    } else if (item.$ref) {
      result.push({
        id,
        $ref: item.$ref,
      });
    } else if (typeof item === 'object' && item !== null) {
      result.push({
        id,
        value: Object.keys(item).map((itemKey) => {
          return {
            key: itemKey,
            value: item[itemKey],
          };
        }),
      });
    } else {
      result.push({
        id, 
        value: item,
      });
    }
  });

  return result;
}

export function buildUiSchemaForItemWithProperties(schema: any, name: string) {
  const properties: any[] = [];

  Object.keys(schema.properties).forEach((key) => {
    const currentProperty = schema.properties[key];
    const item: any = {
      id: `${name}/properties/${key}`,
      displayText: key,
    };

    if (currentProperty.$ref) {
      item.$ref = currentProperty.$ref;
    } else if (typeof currentProperty === 'object' && currentProperty !== null) {
      item.value = Object.keys(currentProperty).map((itemKey) => {
        return {
          key: itemKey,
          value: currentProperty[itemKey],
        }
      });
    } else {
      item.value = currentProperty;
    }
    properties.push(item);
  });

  return {
    id: name,
    properties,
    required: schema.required,
  };
}
