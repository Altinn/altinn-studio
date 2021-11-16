import { CombinationKind, ILanguage, UiSchemaItem } from './types';

const JsonPointer = require('jsonpointer');

function flat(input: UiSchemaItem[] | undefined, depth = 1, stack: UiSchemaItem[] = []) {
  if (input) {
    // eslint-disable-next-line no-restricted-syntax
    for (const item of input) {
      stack.push(item);
      if (item.properties instanceof Array && depth > 0) {
        flat(item.properties, depth - 1, stack);
      }
      if (item.combination instanceof Array && depth > 0) {
        flat(item.combination, depth - 1, stack);
      }
    }
  }
  return stack;
}

export function getUiSchemaItem(schema: UiSchemaItem[], path: string): UiSchemaItem {
  const matches = schema.filter((s) => path.includes(s.path));
  if (matches.length === 1 && matches[0].path === path) {
    return matches[0];
  }
  const items = flat(matches, 999);
  const result = items.find((i) => i.path === path);
  if (!result) {
    throw new Error(`no uiSchema found: ${path}`);
  }
  return result;
}

export const splitParentPathAndName = (path: string): [string | null, string | null] => {
  if (path.match(/[^#]\/properties/)) {
    const index = path.lastIndexOf('/properties/');
    const p = path.substring(0, index);
    const name = path.substring(index + 12);
    return [p, name];
  }

  if (path.match(/anyOf/)) {
    const index = path.lastIndexOf('/anyOf/');
    const p = path.substring(0, index);
    const name = path.substring(index + 7);
    return [p, name];
  }

  if (path.match(/allOf/)) {
    const index = path.lastIndexOf('/allOf/');
    const p = path.substring(0, index);
    const name = path.substring(index + 7);
    return [p, name];
  }

  if (path.match(/oneOf/)) {
    const index = path.lastIndexOf('/oneOf/');
    const p = path.substring(0, index);
    const name = path.substring(index + 7);
    return [p, name];
  }

  return [null, null];
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
    const refItem = schema.find((schemaItem) => schemaItem.path === item.$ref);
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
    JsonPointer.set(result, uiItem.path.replace(/^#/, ''), item);
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
      case 'combination': {
        if (uiSchemaItem[key]?.length) {
          const combinationKind = uiSchemaItem.combinationKind;
          item[combinationKind] = [];
          uiSchemaItem[key]?.forEach((property: UiSchemaItem) => {
            item[combinationKind].push(createJsonSchemaItem(property));
          });
        }
        break;
      }
      case 'path':
      case 'displayName':
      case 'combinationItem':
      case 'combinationKind':
        break;
      default:
        item[key] = uiSchemaItem[key];
        break;
    }
  });
  return item;
}

export function buildUISchema(schema: any, rootPath: string, includeDisplayName: boolean = true): UiSchemaItem[] {
  const result: UiSchemaItem[] = [];
  if (typeof schema !== 'object') {
    result.push({
      path: rootPath,
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
    const path = `${rootPath}/${key}`;
    const displayName = includeDisplayName ? key : path;
    if (item.properties && Object.keys(item.properties).length > 0) {
      result.push(buildUiSchemaForItemWithProperties(item, path, displayName));
    } else if (item.$ref) {
      result.push({
        path,
        $ref: item.$ref,
        displayName,
        title: item.title,
        description: item.description,
      });
    } else if (typeof item === 'object' && item !== null) {
      const {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        title, description, type, enum: enums, items, oneOf, allOf, anyOf, ...restrictions
      } = item;
      result.push({
        path,
        restrictions: Object.keys(restrictions).map((k: any) => ({ key: k, value: restrictions[k] })),
        displayName,
        title,
        description,
        type,
        items,
        enum: enums,
        ...mapJsonSchemaCombinationToUiSchemaItem(item, path),
      });
    } else {
      result.push({
        path,
        value: item,
        displayName,
        title: item.title,
        description: item.description,
      });
    }
  });

  return result;
}

export const mapJsonSchemaCombinationToUiSchemaItem = (item: { [id: string]: any }, parentPath: string) => {
  let combinationKind: CombinationKind;
  if (item.anyOf) {
    combinationKind = 'anyOf';
  } else if (item.allOf) {
    combinationKind = 'allOf';
  } else if (item.oneOf) {
    combinationKind = 'oneOf';
  } else {
    return null;
  }
  const combination = item[combinationKind]?.map(
    (child: UiSchemaItem, index: number) => mapCombinationItemTypeToUiSchemaItem(
      child, index, combinationKind, parentPath,
    ),
  );
  return {
    combination,
    combinationKind,
  };
};

export const mapCombinationItemTypeToUiSchemaItem = (
  item: UiSchemaItem, index: number, key: CombinationKind, parentPath: string,
) => {
  return {
    ...item,
    path: `${parentPath}/${key}/${index}`,
    displayName: item.$ref !== undefined ? 'ref' : 'Inline object',
    combinationItem: true,
  };
};

export const nullableType = (item: UiSchemaItem) => item.type?.toLowerCase() === 'null';

export const combinationIsNullable = (item?: UiSchemaItem | null): boolean => {
  return !!(item?.combination?.some(nullableType));
};

export const mapCombinationChildren = (children: UiSchemaItem[], toType: CombinationKind): UiSchemaItem[] => {
  // example case, going from oneOf to allOf
  // example input: #/definitions/allOfTest/allOf/1/something/properties/oneOfTest/oneOf/0
  // example output: #/definitions/allOfTest/allOf/1/something/properties/oneOfTest/allOf/0
  return children.map((child) => {
    const splitPath = child.path.split('/');
    splitPath[splitPath.length - 2] = toType;
    const mappedPath = splitPath.join('/');
    return {
      ...child,
      path: mappedPath,
    };
  });
};

export const buildUiSchemaForItemWithProperties = (schema: { [key: string]: { [key: string]: any } },
  name: string, displayName?: string): UiSchemaItem => {
  const rootProperties: any[] = [];

  Object.keys(schema.properties).forEach((key) => {
    const currentProperty = schema.properties[key];
    const {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      type, title, description, properties, enum: enums, items, oneOf, allOf, anyOf, ...restrictions
    } = currentProperty;
    const path = `${name}/properties/${key}`;
    const item: UiSchemaItem = {
      path,
      displayName: key,
      type,
      title,
      enum: enums,
      items,
      description,
      ...(mapJsonSchemaCombinationToUiSchemaItem(currentProperty, path)),
    };

    if (currentProperty.$ref) {
      item.$ref = currentProperty.$ref;
    } else if (typeof currentProperty === 'object' && currentProperty !== null) {
      if (properties) {
        item.properties = buildUISchema(currentProperty.properties, `${item.path}/properties`, true);
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
    path: name,
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
  const string = `schema_editor.${key}`;
  return getNestedObject(language, string.split('.')) ?? key;
};

const getNestedObject = (nestedObj: any, pathArr: string[]) => {
  return pathArr.reduce((obj, key) => ((obj && obj[key] !== 'undefined') ? obj[key] : undefined), nestedObj);
};

const stringRestrictions = ['minLength', 'maxLength', 'pattern', 'format'];
const integerRestrictions = ['minimum', 'exclusiveminimum', 'maximum', 'exclusivemaximum'];
const objectRestrictions = ['minProperties', 'maxProperties'];
const arrayRestrictions = ['minItems', 'maxItems'];

const restrictionMap = new Map([
  ['string', stringRestrictions],
  ['integer', integerRestrictions],
  ['number', integerRestrictions],
  ['object', objectRestrictions],
  ['array', arrayRestrictions],
]);
export const getRestrictions = (type: string) => restrictionMap.get(type);

let unusedNumber = 0;
export const getUniqueNumber = () => {
  // eslint-disable-next-line no-plusplus
  return unusedNumber++;
};
export const resetUniqueNumber = () => {
  unusedNumber = 0;
};
