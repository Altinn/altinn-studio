import { ItemType } from "./features/editor/schemaEditorSlice";

const JsonPointer = require('jsonpointer');

export function getUiSchemaItem(schema: any[], path: string, itemType: ItemType, key?: string): any {
  let propertyId: string;
  if (itemType === ItemType.Property) {
    [path, propertyId] = path.split('/properties/');
  }

  let item: any = schema.find((item) => item.id === path);
  if (itemType === ItemType.Property) {
    item = item.properties.find((item: any) => item.id === `${path}/properties/${propertyId}`);
  }

  if (key) {
    item = item.value.find((item: any) => item.key === key);
  }

  return item;
}

export function buildJsonSchema(uiSchema: any[]): any {
  const result: any = {};
  uiSchema.forEach((uiItem) => {
    const item = createJsonSchemaItem(uiItem);
    JsonPointer.set(result, uiItem.id.replace(/^#/, ''), item);
  });

  return result;
}

export function createJsonSchemaItem(uiSchemaItem: any): any {
  if (uiSchemaItem.$ref) {
    return { $ref: uiSchemaItem.$ref };
  }

  const item: any = {};
  Object.keys(uiSchemaItem).forEach((key) => {
    switch(key) {
      case 'properties':{
        const properties: any = {};
        item.properties = properties;
        uiSchemaItem.properties.forEach((property: any) => {
          item.properties[property.name] = createJsonSchemaItem(property);
        });
        break;
      }
      case 'value': {
        if (Array.isArray(uiSchemaItem.value)) {
          uiSchemaItem.value.forEach((valueItem: any) => {
            item[valueItem.key] = valueItem.value;
          });
        } 
        break;
      }
      case 'required': {
        item.required = uiSchemaItem.required;
        break;
      }
      case 'id':
      case 'name':
        break;
      default:
        item[key] = uiSchemaItem[key];
        break;
    }
  });
  return item;
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
      name: key,
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

  const rest: any = {};
  Object.keys(schema).forEach((key) => {
    if (key === 'properties') {
      return;
    }
    rest[key] = schema[key];
  })

  return {
    id: name,
    properties,
    required: schema.required,
    ...rest,
  };
}
