import { CombinationKind, FieldType, Restriction } from '../types';
import { ObjectKind } from '../types/enums';
import JSONPointer from 'jsonpointer';
import { getRestrictions } from './restrictions';

export const createNodeId = () => (Math.random() + 1).toString(36).substring(7);

export const ROOT_POINTER = '#';

export interface NewUiSchemaItem {
  nodeId: string;
  objectKind: ObjectKind;
  fieldType: FieldType | CombinationKind;
  implicitType: boolean; // the
  pointer: string;
  ref?: string;
  attributes: { [key: string]: any };
  children: string[];
  description?: string;
  enum?: string[];
  isRequired: boolean;
  title?: string;
  value?: any;
  restrictions: Restriction[];
}
const createNodeBase = (...args: string[]): NewUiSchemaItem => {
  const pointer = args.join('/');
  return {
    fieldType: FieldType.Object,
    objectKind: ObjectKind.Field,
    nodeId: createNodeId(),
    pointer,
    isRequired: false,
    children: [],
    attributes: {},
    restrictions: [],
    implicitType: false,
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
  nodeBase?: NewUiSchemaItem,
): Map<string, NewUiSchemaItem> => {
  const parentNode = nodeBase ?? createNodeBase(ROOT_POINTER);
  parentNode.objectKind =
    parentSchema.$ref !== undefined ? ObjectKind.Reference : ObjectKind.Field;

  const map = new Map<string, NewUiSchemaItem>();

  /**
   * Dealing with combinaton Kinds
   */
  Object.values(CombinationKind).forEach((kind) => {
    if (parentSchema[kind]) {
      // The current schema is a combination schema.
      parentSchema[kind].map((node: any, index: any) => {
        const child = createNodeBase(parentNode.pointer, kind, index);
        child.isRequired = false;
        createUiSchema(node, child).forEach((i, k) => map.set(k, i));
        parentNode.children.push(child.nodeId);
      });
      parentNode.objectKind = ObjectKind.Combination;

      // For some weird reason some combination items might have a type set, and apparently that is ok.
      parentNode.fieldType = parentSchema.type ?? kind;
    }
  });

  /**
   * Dealing properties and definitions
   */

  if (parentSchema.$defs) {
    Object.keys(parentSchema.$defs).forEach((key) => {
      const child = createNodeBase(parentNode.pointer, '$defs', key);
      createUiSchema(parentSchema.$defs[key], child).forEach((v, k) =>
        map.set(k, v),
      );
      parentNode.children.push(child.nodeId);
    });
  }
  if (parentSchema.properties) {
    Object.keys(parentSchema.properties).forEach((key) => {
      const child = createNodeBase(parentNode.pointer, 'properties', key);
      child.isRequired = !!parentSchema.required?.includes(key);
      createUiSchema(parentSchema.properties[key], child).forEach((v, k) =>
        map.set(k, v),
      );
      parentNode.children.push(child.nodeId);
    });
  }
  const specialAttributes = [
    'type',
    '$ref',
    '$defs',
    'required',
    'properties',
    ...Object.values(CombinationKind),
  ];
  Object.keys(parentSchema).forEach((key) => {
    if (!specialAttributes.includes(key)) {
      parentNode.attributes[key] = parentSchema[key];
    }
  });

  // Restrictions
  if (parentSchema.type && parentNode.objectKind === ObjectKind.Field) {
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

  if (typeof parentSchema.properties === 'object') {
    parentNode.fieldType = FieldType.Object;
  } else if (parentSchema.type && parentNode.objectKind === ObjectKind.Field) {
    parentNode.fieldType = parentSchema.type;
  }

  if (!parentSchema.type) {
    parentNode.implicitType = true;
  }

  return map.set(parentNode.nodeId, {
    ...parentNode,
    ref: parentSchema.$ref,
  });
};

export const createJsonSchema = (uiSchemaMap: Map<string, NewUiSchemaItem>) => {
  const allPointers: string[] = [];
  const output: any = {};
  const lookup = createPointerLookupTable(uiSchemaMap);
  uiSchemaMap.forEach((uiSchemaNode) => {
    if (uiSchemaNode.pointer === ROOT_POINTER) {
      Object.assign(output, uiSchemaNode.attributes);
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
  allPointers.forEach((sortedPointer: string) => {
    const uiSchemaNode = uiSchemaMap.get(
      lookup.get(sortedPointer) as string,
    ) as NewUiSchemaItem;
    const pointer = uiSchemaNode.pointer.replace(ROOT_POINTER, '');
    const startValue = Object.assign({}, uiSchemaNode.attributes);
    if (uiSchemaNode.objectKind === ObjectKind.Combination) {
      startValue[uiSchemaNode.fieldType] = [];
    }

    JSONPointer.set(output, pointer, startValue);

    // Resolving and setting reference
    if (uiSchemaNode.ref) {
      const reference = uiSchemaMap.get(uiSchemaNode.ref) as NewUiSchemaItem;
      JSONPointer.set(output, [pointer, '$ref'].join('/'), reference.pointer);
    }

    // Setting Type for fields
    if (
      uiSchemaNode.objectKind === ObjectKind.Field &&
      !uiSchemaNode.implicitType
    ) {
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
