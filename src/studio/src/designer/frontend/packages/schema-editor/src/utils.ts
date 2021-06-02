import { ILanguage, UiSchemaItem } from './types';

const JsonPointer = require('jsonpointer');

export function getUiSchemaItem(schema: UiSchemaItem[], path: string): UiSchemaItem {
  let propertyId: string | null = null;
  if (path.includes('/properties/')) {
    // eslint-disable-next-line no-param-reassign
    [path, propertyId] = path.split('/properties/');
  }
  let schemaItem: UiSchemaItem = schema.find((item) => item.id === path) || {} as UiSchemaItem;
  if (schemaItem.properties && propertyId) {
    schemaItem = schemaItem.properties.find((item: any) => item.id === `${path}/properties/${propertyId}`) || {} as UiSchemaItem;
  }

  return schemaItem;
}

export function getUiSchemaTreeFromItem(
  schema: UiSchemaItem[],
  item: UiSchemaItem,
  isProperty?: boolean,
): UiSchemaItem[] {
  let itemList: UiSchemaItem[] = [];
  if (!isProperty) {
    itemList.push(item);
  }

  if (item.$ref) {
    const refItem = schema.find((schemaItem) => schemaItem.id === item.$ref);
    if (refItem) {
      itemList = itemList.concat(getUiSchemaTreeFromItem(schema, refItem));
    }
  } else if (item.properties) {
    item.properties.forEach((property) => {
      const propertyItem = getUiSchemaTreeFromItem(schema, property, true);
      if (propertyItem) {
        itemList = itemList.concat(propertyItem);
      }
    });
  }

  return itemList;
}

export function buildJsonSchema(uiSchema: UiSchemaItem[]): any {
  const result: any = {};
  uiSchema.forEach((uiItem) => {
    const item = createJsonSchemaItem(uiItem);
    JsonPointer.set(result, uiItem.id.replace(/^#/, ''), item);
  });

  return result;
}

export function createJsonSchemaItem(uiSchemaItem: UiSchemaItem | any): any {
  let item: any = {};
  Object.keys(uiSchemaItem).forEach((key) => {
    switch (key) {
      case 'properties': {
        item.properties = {};
        uiSchemaItem.properties?.forEach((property: any) => {
          item.properties[property.name] = createJsonSchemaItem(property);
        });
        break;
      }
      case 'keywords': {
        uiSchemaItem.keywords?.forEach((field: any) => {
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

export function buildUISchema(schema: any, rootPath: string, includeDisplayName?: boolean): UiSchemaItem[] {
  const result : UiSchemaItem[] = [];
  if (typeof schema !== 'object') {
    result.push({
      id: rootPath,
      value: schema,
    });
    return result;
  }

  Object.keys(schema).forEach((key) => {
    const item = schema[key];
    const id = `${rootPath}/${key}`;
    if (item.properties) {
      result.push(buildUiSchemaForItemWithProperties(item, id, includeDisplayName ? key : undefined));
    } else if (item.$ref) {
      result.push({
        id,
        $ref: item.$ref,
        name: includeDisplayName ? key : undefined,
      });
    } else if (typeof item === 'object' && item !== null) {
      result.push({
        id,
        keywords: Object.keys(item).map((itemKey) => {
          return {
            key: itemKey,
            value: item[itemKey],
          };
        }),
        name: includeDisplayName ? key : undefined,
      });
    } else {
      result.push({
        id,
        value: item,
        name: includeDisplayName ? key : undefined,
      });
    }
  });

  return result;
}

export function buildUiSchemaForItemWithProperties(schema: any, name: string, displayName?: string) {
  const properties: any[] = [];

  Object.keys(schema.properties).forEach((key) => {
    const currentProperty = schema.properties[key];
    const item: UiSchemaItem = {
      id: `${name}/properties/${key}`,
      name: key,
    };

    if (currentProperty.$ref) {
      item.$ref = currentProperty.$ref;
    } else if (typeof currentProperty === 'object' && currentProperty !== null) {
      item.keywords = Object.keys(currentProperty).map((itemKey) => {
        return {
          key: itemKey,
          value: currentProperty[itemKey],
        };
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
  });

  return {
    id: name,
    properties,
    required: schema.required,
    name: displayName,
    ...rest,
  };
}
export const getDomFriendlyID = (id: string) => id.replace(/\//g, '').replace('#', '');

export const getTranslation = (key: string, language: ILanguage) => {
  if (!key) {
    return key;
  }
  return getNestedObject(language, key.split('.')) ?? key;
};

const getNestedObject = (nestedObj: any, pathArr: string[]) => {
  return pathArr.reduce((obj, key) => ((obj && obj[key] !== 'undefined') ? obj[key] : undefined), nestedObj);
};
