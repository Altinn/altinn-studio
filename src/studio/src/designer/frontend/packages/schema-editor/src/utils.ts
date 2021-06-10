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

export function getUiSchemaItem(schema: UiSchemaItem[], path: string): UiSchemaItem {
  const matches = schema.filter((s) => path.includes(s.id));
  if (matches.length === 1 && matches[0].id === path) {
    return matches[0];
  }
  const items = flat(matches, 999);
  const result = items.find((i) => i.id === path);
  if (!result) {
    throw new Error(`no uiSchema found: ${path}`);
  }
  return result;
}

export const getParentPath = (path: string): string | null => {
  if (path.match(/[^#]\/properties/)) {
    const index = path.lastIndexOf('/properties/');
    return path.substring(0, index);
  }
  return null;
};

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
  result.$schema = 'https://json-schema.org/draft/2020-12/schema';
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
      case 'restrictions': {
        uiSchemaItem.restrictions?.forEach((field: any) => {
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
    if (key === '$schema') {
      return;
    }
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
      const {
        title, description, type, items, ...restrictions
      } = item;
      result.push({
        id,
        restrictions: Object.keys(restrictions).map((k: any) => ({ key: k, value: restrictions[k] })),
        displayName,
        title,
        description,
        type,
        items,
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
  const rootProperties: any[] = [];

  Object.keys(schema.properties).forEach((key) => {
    const currentProperty = schema.properties[key];
    const {
      type, title, description, properties, ...restrictions
    } = currentProperty;
    const item: UiSchemaItem = {
      id: `${name}/properties/${key}`,
      displayName: key,
      type,
      title,
      description,
    };

    if (currentProperty.$ref) {
      item.$ref = currentProperty.$ref;
    } else if (typeof currentProperty === 'object' && currentProperty !== null) {
      if (properties) {
        item.properties = buildUISchema(currentProperty.properties, `${item.id}/properties`, true);
      }

      item.restrictions = Object.keys(restrictions).map((k: string) => ({ key: k, value: currentProperty[k] }));
    } else {
      item.value = currentProperty;
    }
    rootProperties.push(item);
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
    properties: rootProperties,
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

const stringRestrictions = ['minLength', 'maxLength', 'pattern', 'format'];
const integerRestrictions = ['minimum', 'exclusiveminimum', 'maximum', 'exclusivemaximum'];
const objectRestrictions = ['minProperties', 'maxProperties'];
const arrayRestrictions = ['items', 'additionalItems', 'minItems', 'maxItems'];

const restrictionMap = new Map([
  ['string', stringRestrictions],
  ['integer', integerRestrictions],
  ['number', integerRestrictions],
  ['object', objectRestrictions],
  ['array', arrayRestrictions],
]);
export const getRestrictions = (type: string) => restrictionMap.get(type);
