import {
  CombinationKind,
  FieldType,
  Restriction,
  UiSchemaItem,
} from '../types';

import JsonPointer from 'jsonpointer';

function flat(
  input: UiSchemaItem[] | undefined,
  depth = 1,
  stack: UiSchemaItem[] = [],
) {
  if (input) {
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
export function getUiSchemaItemsByRef(
  uiSchemaItems: UiSchemaItem[],
  $ref: string,
): UiSchemaItem[] {
  return flat(uiSchemaItems).filter((item) => item.$ref === $ref);
}

export function getUiSchemaItem(
  uiSchemaItems: UiSchemaItem[],
  path: string,
): UiSchemaItem {
  const matches = uiSchemaItems.filter((s) => path.includes(s.path));
  const uiSchemaFound =
    matches.length === 1 && matches[0].path === path
      ? matches[0]
      : flat(matches, 999).find((i) => i.path === path);

  if (!uiSchemaFound) {
    throw new Error(`no uiSchema found: ${path}`);
  }
  return uiSchemaFound;
}

export const splitParentPathAndName = (
  path: string,
): [string | null, string | null] => {
  if (path.match(/[^#]\/properties/)) {
    const index = path.lastIndexOf('/properties/');
    const p = path.substring(0, index);
    const name = path.substring(index + 12);
    return [p, name];
  }

  if (path.match(/\/anyOf\//)) {
    const index = path.lastIndexOf('/anyOf/');
    const p = path.substring(0, index);
    const name = path.substring(index + 7);
    return [p, name];
  }

  if (path.match(/\/allOf\//)) {
    const index = path.lastIndexOf('/allOf/');
    const p = path.substring(0, index);
    const name = path.substring(index + 7);
    return [p, name];
  }

  if (path.match(/\/oneOf\//)) {
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
  return result;
}

export function createJsonSchemaItem(uiSchemaItem: UiSchemaItem | any): any {
  let jsonSchemaItem: any = {};
  Object.keys(uiSchemaItem).forEach((key) => {
    switch (key) {
      case 'properties': {
        jsonSchemaItem.properties = jsonSchemaItem.properties || {};
        uiSchemaItem.properties?.forEach((property: UiSchemaItem) => {
          jsonSchemaItem.properties[property.displayName] =
            createJsonSchemaItem(property);
        });
        break;
      }
      case 'restrictions': {
        if (['#/oneOf'].includes(uiSchemaItem.path)) {
          jsonSchemaItem = uiSchemaItem.restrictions.map((res: Restriction) => {
            return res.value;
          });
          break;
        }

        uiSchemaItem.restrictions?.forEach((field: any) => {
          jsonSchemaItem[field.key] = field.value;
        });
        break;
      }
      case 'required': {
        jsonSchemaItem.required = uiSchemaItem.required;
        break;
      }
      case 'value': {
        jsonSchemaItem = uiSchemaItem.value;
        break;
      }
      case 'combination': {
        if (uiSchemaItem[key]?.length) {
          const combinationKind = uiSchemaItem.combinationKind;
          jsonSchemaItem[combinationKind] = [];
          uiSchemaItem[key]?.forEach((property: UiSchemaItem) => {
            jsonSchemaItem[combinationKind].push(
              createJsonSchemaItem(property),
            );
          });
        }
        break;
      }
      case 'path':
      case 'displayName':
      case 'combinationItem':
      case 'combinationKind':
      case 'isRequired':
        break;
      default:
        if (typeof jsonSchemaItem === 'object') {
          jsonSchemaItem[key] = uiSchemaItem[key];
        }

        break;
    }
  });
  return jsonSchemaItem;
}

export function getSubSchema(schema: any, pathArray: string[]): any {
  const subSchema = schema[pathArray[0]];
  if (pathArray.length === 1) {
    return subSchema;
  }
  return getSubSchema(subSchema, pathArray.slice(1));
}

export function getSchemaFromPath(path: string, schema: any) {
  return JsonPointer.compile(path).get(schema);
}

export function buildUISchema(
  schema: any,
  rootPath: string,
  includeDisplayName = true,
): UiSchemaItem[] {
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
    const item = schema[key];
    const path = `${rootPath}/${key}`;
    const displayName = includeDisplayName ? key : path;

    if (item?.properties && Object.keys(item.properties).length > 0) {
      result.push(buildUiSchemaForItemWithProperties(item, path, displayName));
    } else if (item.$ref) {
      result.push({
        path,
        $ref: item.$ref,
        displayName,
        ...(item.title && { title: item.title }),
        ...(item.description && { description: item.description }),
      });
    } else if (typeof item === 'object') {
      const {
        title,
        description,
        type,
        enum: enums,
        items,
        oneOf,
        allOf,
        anyOf,
        ...restrictions
      } = item;
      result.push({
        path,
        restrictions: Object.keys(restrictions).map((k: any) => ({
          key: k,
          value: restrictions[k],
        })),
        displayName,
        ...(items && { items }),
        ...(type && { type }),
        ...(title && { title }),
        ...(enums && { enum: enums }),
        ...(description && { description }),
        ...mapJsonSchemaCombinationToUiSchemaItem(item, path),
      });
    } else {
      result.push({
        path,
        value: item,
        displayName,
        ...(item.title && { title: item.title }),
        ...(item.description && { description: item.description }),
      });
    }
  });

  return result;
}

export const mapJsonSchemaCombinationToUiSchemaItem = (
  item: { [id: string]: any },
  parentPath: string,
) => {
  let combinationKind: CombinationKind;
  if (item.anyOf) {
    combinationKind = CombinationKind.AnyOf;
  } else if (item.allOf) {
    combinationKind = CombinationKind.AllOf;
  } else if (item.oneOf) {
    combinationKind = CombinationKind.OneOf;
  } else {
    return null;
  }
  const combination = item[combinationKind]?.map(
    (child: UiSchemaItem, index: number) =>
      mapCombinationItemTypeToUiSchemaItem(
        child,
        index,
        combinationKind,
        parentPath,
      ),
  );
  return {
    combination,
    combinationKind,
  };
};

export const mapCombinationItemTypeToUiSchemaItem = (
  item: any,
  index: number,
  key: CombinationKind,
  parentPath: string,
) => {
  const uiSchemaItem = item.properties
    ? buildUiSchemaForItemWithProperties(item, `${parentPath}/${key}/${index}`)
    : {
        ...item,
        path: `${parentPath}/${key}/${index}`,
      };
  return {
    ...uiSchemaItem,
    displayName: item.$ref !== undefined ? 'ref' : `allOf[${index}]`,
    combinationItem: true,
  };
};

export const nullableType = (item: UiSchemaItem) =>
  item.type?.toLowerCase() === 'null';

export const combinationIsNullable = (item?: UiSchemaItem | null): boolean => {
  return !!item?.combination?.some(nullableType);
};

export const mapCombinationChildren = (
  children: UiSchemaItem[],
  toType: CombinationKind,
): UiSchemaItem[] => {
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

export const buildUiSchemaForItemWithProperties = (
  schema: { [key: string]: { [key: string]: any } },
  name: string,
  displayName?: string,
): UiSchemaItem => {
  const rootProperties: any[] = [];

  Object.keys(schema.properties).forEach((key) => {
    const currentProperty = schema.properties[key];
    const {
      type,
      title,
      description,
      properties,
      enum: enums,
      items,
      oneOf,
      allOf,
      anyOf,
      ...restrictions
    } = currentProperty;
    const path = `${name}/properties/${key}`;
    const item: UiSchemaItem = {
      path,
      displayName: key,
      ...(type && { type }),
      ...(title && { title }),
      ...(enums && { enum: enums }),
      ...(items && { items }),
      ...(description && { description }),
      ...mapJsonSchemaCombinationToUiSchemaItem(currentProperty, path),
    };

    if (currentProperty.$ref) {
      item.$ref = currentProperty.$ref;
    } else if (typeof currentProperty === 'object') {
      if (properties) {
        item.properties = buildUISchema(
          currentProperty.properties,
          `${item.path}/properties`,
          true,
        );
      }

      item.restrictions = Object.keys(restrictions).map((k: string) => ({
        key: k,
        value: currentProperty[k],
      }));
    } else {
      item.value = currentProperty;
    }

    item.isRequired = schema.required?.includes(item.displayName);

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
    displayName,
    type: FieldType.Object,
    ...rest,
  };
};

export const getDomFriendlyID = (id: string) =>
  id.replace(/\//g, '').replace('#', '');

export const updateChildPaths = (item: UiSchemaItem, parentId: string) => {
  item.path = `${parentId}/properties/${item.displayName}`;
  if (item.properties) {
    item.properties.forEach((p) => updateChildPaths(p, item.path));
  }
};

let unusedNumber = 0;
export const getUniqueNumber = () => unusedNumber++;

export const resetUniqueNumber = () => (unusedNumber = 0);
