import { ItemType, UiSchemaItem } from './types';

const JsonPointer = require('jsonpointer');

export function getUiSchemaItem(schema: UiSchemaItem[], path: string, itemType: ItemType): UiSchemaItem {
  let propertyId: string;
  if (itemType === ItemType.Property) {
    [path, propertyId] = path.split('/properties/');
  }

  let schemaItem: UiSchemaItem = schema.find((item) => item.id === path) || {} as UiSchemaItem;
  if (schemaItem.properties) {
    schemaItem = schemaItem.properties.find((item: any) => item.id === `${path}/properties/${propertyId}`) || {} as UiSchemaItem;
  }

  return schemaItem;
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
  let item: any = {};
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
      case 'fields': {
        uiSchemaItem.fields.forEach((field: any) => {
          item[field.key] = field.value;
        });
        break;
      }
      case 'required': {
        item.required = uiSchemaItem.required;
        break;
      }
      case 'value': {
        item = uiSchemaItem.value;
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

export function buildUISchema(schema: any, rootPath: string) {
  const result : any[] = [];
  if (typeof schema !== 'object') {
    return {
      id: rootPath,
      value: schema,
    };
  }

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
        fields: Object.keys(item).map((itemKey) => {
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
      item.fields = Object.keys(currentProperty).map((itemKey) => {
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
