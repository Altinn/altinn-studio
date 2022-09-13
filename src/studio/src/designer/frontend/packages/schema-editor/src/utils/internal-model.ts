import { CombinationKind, FieldType, Restriction } from '../types';
import { ObjectKind } from '../types/enums';
import JSONPointer from 'jsonpointer';
import { getRestrictions } from './restrictions';

export const createNodeId = () => (Math.random() + 1).toString(36).substring(7);

export const ROOT_POINTER = '#';

interface ItemBase {
  nodeId: string;
  pointer: string;
  isRequired?: boolean;
  children: string[];
  attributes: Map<string, any>;
  restrictions: Restriction[];
}
export interface NewUiSchemaItem extends ItemBase {
  description?: string;
  enum?: string[];
  fieldType?: FieldType;
  objectKind?: ObjectKind;
  pointer: string;
  ref?: string;
  title?: string;
  value?: any;
}
const createNodeBase = (pointer: string): ItemBase => {
  return {
    nodeId: createNodeId(),
    pointer,
    isRequired: true,
    children: [],
    attributes: new Map(),
    restrictions: [],
  };
};

const createPointerLookupTable = (
  map: Map<string, NewUiSchemaItem>,
): Map<string, string> => {
  const lookupTable = new Map();
  map.forEach((item) => lookupTable.set(item.pointer, item.nodeId));
  return lookupTable;
};
export const createUiSchema = (
  parentSchema: any,
  nodeBase?: ItemBase,
): Map<string, NewUiSchemaItem> => {
  const parentNode = nodeBase ?? createNodeBase(ROOT_POINTER);
  const map = new Map<string, NewUiSchemaItem>();

  /**
   * Dealing with combinaton Kinds
   */
  Object.values(CombinationKind).forEach((kind) => {
    if (parentSchema[kind]) {
      const combo = createNodeBase([parentNode.pointer, kind].join('/'));
      parentSchema[kind].map((node: any, index: any) => {
        const child = createNodeBase([combo.pointer, index].join('/'));
        createUiSchema(node, child).forEach((i, k) => map.set(k, i));
        combo.children.push(child.nodeId);
      });
      map.set(combo.nodeId, {
        ...combo,
        objectKind: ObjectKind.Combination,
      });
    }
  });

  /**
   * Dealing properties and definitions
   */
  const containsNodes = ['$defs', 'properties'];
  containsNodes.forEach((key1) => {
    if (parentSchema[key1]) {
      Object.keys(parentSchema[key1]).forEach((key2) => {
        const child = createNodeBase(
          [parentNode.pointer, key1, key2].join('/'),
        );
        child.isRequired = !!parentSchema.required?.includes(key2);
        createUiSchema(parentSchema[key1][key2], child).forEach((v, k) =>
          map.set(k, v),
        );
        parentNode.children.push(child.nodeId);
      });
    }
  });
  const ignore = ['type', '$ref', 'required'];
  Object.keys(parentSchema).forEach((key) => {
    if (!containsNodes.includes(key) && !ignore.includes(key)) {
      parentNode.attributes.set(key, parentSchema[key]);
    }
  });
  const objectKind =
    parentSchema.$ref !== undefined ? ObjectKind.Reference : ObjectKind.Field;

  // Restrictions
  if (parentSchema.type) {
    getRestrictions(parentSchema.type).forEach((key) =>
      parentNode.restrictions.push({
        key,
        value: parentSchema[key],
      }),
    );
  }

  // Just resolve references when we are dealing with the root, all items is resolved at this point.
  if (parentNode.pointer === ROOT_POINTER) {
    const lookup = createPointerLookupTable(map);
    map.forEach((item) => {
      if (item.ref) {
        item.ref = lookup.get(item.ref);
      }
    });
  }
  return map.set(parentNode.nodeId, {
    ...parentNode,
    fieldType: parentSchema.type,
    objectKind,
    ref: parentSchema.$ref,
  });
};

export const createJsonSchema = (uiSchemaMap: Map<string, NewUiSchemaItem>) => {
  const allPointers: string[] = [];
  const output: any = {};
  uiSchemaMap.forEach((uiSchemaNode) => {
    if (uiSchemaNode.pointer === ROOT_POINTER) {
      uiSchemaNode.attributes.forEach((value, key) => {
        output[key] = value;
      });
      output.type = uiSchemaNode.fieldType;

      // Find required children
      JSONPointer.set(
        output,
        '/required',
        getRequiredChildrenArray(uiSchemaNode.nodeId, uiSchemaMap),
      );
    } else {
      allPointers.push(uiSchemaNode.pointer);
    }
  });
  allPointers.sort();

  const lookup = createPointerLookupTable(uiSchemaMap);
  allPointers.forEach((sortedPointer: string) => {
    const uiSchemaNode = uiSchemaMap.get(
      lookup.get(sortedPointer) as string,
    ) as NewUiSchemaItem;
    const pointer = uiSchemaNode.pointer.replace(ROOT_POINTER, '');
    const startValue =
      uiSchemaNode.objectKind === ObjectKind.Combination
        ? []
        : Object.fromEntries(uiSchemaNode.attributes);

    JSONPointer.set(output, pointer, startValue);

    // Resolving and setting reference
    if (uiSchemaNode.ref) {
      const reference = uiSchemaMap.get(uiSchemaNode.ref) as NewUiSchemaItem;
      JSONPointer.set(output, [pointer, '$ref'].join('/'), reference.pointer);
    }
    // Setting Type
    if (uiSchemaNode.fieldType) {
      JSONPointer.set(
        output,
        [pointer, 'type'].join('/'),
        uiSchemaNode.fieldType,
      );
    }

    // Restrictions
    uiSchemaNode.restrictions.forEach((restriction) =>
      JSONPointer.set(
        output,
        [pointer, restriction.key].join('/'),
        restriction.value,
      ),
    );

    if (
      uiSchemaNode.children.length > 0 &&
      uiSchemaNode.objectKind !== ObjectKind.Combination
    ) {
      JSONPointer.set(output, [pointer, 'properties'].join('/'), {});
      // Find required children
      JSONPointer.set(
        output,
        [pointer, 'required'].join('/'),
        getRequiredChildrenArray(uiSchemaNode.nodeId, uiSchemaMap),
      );
    }
  });
  return output;
};

export const getRequiredChildrenArray = (
  parentNodeId: string,
  uischemamap: Map<string, NewUiSchemaItem>,
): string[] | undefined => {
  const uiSchemaNode = uischemamap.get(parentNodeId) as NewUiSchemaItem;
  const required: string[] = [];

  uiSchemaNode.children.forEach((nodeId) => {
    const child = uischemamap.get(nodeId) as NewUiSchemaItem;
    if (child.isRequired) {
      required.push(child.pointer.split('/').pop() as string);
    }
  });
  return required.length > 0 ? required : undefined;
};
