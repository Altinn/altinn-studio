import { ILanguage, UiSchemaItem } from './types';

const JsonPointer = require('jsonpointer');

function flat(input: UiSchemaItem[] | undefined, depth = 1, stack: UiSchemaItem[] = []) {
  if (input) {
    // eslint-disable-next-line no-restricted-syntax
    for (const item of input) {
      stack.push(item);
      if (item.properties instanceof Array && depth > 0) {
        flat(item.properties, depth - 1, stack);
      }
    }
  }
  return stack;
}
export const getSchemaType = (schema: UiSchemaItem): string | undefined => schema.keywords?.find((k) => k.key === 'type')?.value;

export function getUiSchemaItem(schema: UiSchemaItem[], path: string): UiSchemaItem {
  // should we cache this flattened structure in state somehow for faster lookups?
  const items = flat(schema, 999);
  return items.find((i) => i.id === path) || {} as UiSchemaItem;
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
        uiSchemaItem.properties?.forEach((property: UiSchemaItem) => {
          item.properties[property.displayName] = createJsonSchemaItem(property);
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
      case 'displayName':
        break;
      default:
        item[key] = uiSchemaItem[key];
        break;
    }
  });
  return item;
}

export function buildUISchema(schema: any, rootPath: string, includeDisplayName: boolean = true): UiSchemaItem[] {
  const result : UiSchemaItem[] = [];
  if (typeof schema !== 'object') {
    result.push({
      id: rootPath,
      value: schema,
      displayName: rootPath,
    });
    return result;
  }

  Object.keys(schema).forEach((key) => {
    const item = schema[key];
    const id = `${rootPath}/${key}`;
    const displayName = includeDisplayName ? key : id;
    if (item.properties) {
      result.push(buildUiSchemaForItemWithProperties(item, id, displayName));
    } else if (item.$ref) {
      result.push({
        id,
        $ref: item.$ref,
        displayName,
        title: item.title,
        description: item.description,
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
        displayName,
        title: item.title,
        description: item.description,
      });
    } else {
      result.push({
        id,
        value: item,
        displayName,
        title: item.title,
        description: item.description,
      });
    }
  });

  return result;
}

export const buildUiSchemaForItemWithProperties = (schema: {[key: string]: {[key: string]: any}},
  name: string, displayName?: string): UiSchemaItem => {
  const properties: any[] = [];

  Object.keys(schema.properties).forEach((key) => {
    const currentProperty = schema.properties[key];
    const item: UiSchemaItem = {
      id: `${name}/properties/${key}`,
      displayName: key,
    };

    if (currentProperty.$ref) {
      item.$ref = currentProperty.$ref;
    } else if (typeof currentProperty === 'object' && currentProperty !== null) {
      item.keywords = [];
      Object.keys(currentProperty).forEach((k: string) => {
        if (k === 'properties') {
          item.properties = buildUISchema(currentProperty.properties, `${item.id}/properties`, true);
        } else {
          item.keywords?.push({
            key: k,
            value: currentProperty[k],
          });
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
  });

  return {
    id: name,
    properties,
    required: schema.required,
    displayName,
    ...rest,
  };
};

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
