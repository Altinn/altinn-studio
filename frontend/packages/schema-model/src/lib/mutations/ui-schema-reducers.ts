import { getNodeByPointer, getParentNodeByPointer } from '../selectors';
import {
  CombinationKind,
  FieldType,
  Keyword,
  ObjectKind,
  UiSchemaNode,
  UiSchemaNodes,
  UiSchemaReducer
} from '../../types';
import { deepCopy } from 'app-shared/pure';
import {
  createNodeBase,
  getUniqueNodePath,
  makePointer,
  replaceLastPointerSegment,
  splitPointerInBaseAndName
} from '../utils';
import { ROOT_POINTER } from '../constants';
import { convertPropToType } from './convert-node';
import { removeNodeByPointer } from './remove-node';
import { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import { castRestrictionType } from '../restrictions';
import { renameNodePointer } from './rename-node';
import { removeItemByValue, swapArrayElements } from 'app-shared/utils/arrayUtils';


export type AddEnumValueArgs = {
  path: string;
  value: string;
  oldValue?: string;
};
export const addEnumValue: UiSchemaReducer<AddEnumValueArgs> =
  (uiSchema: UiSchemaNodes, { path, value, oldValue }) => {
    const newSchema = deepCopy(uiSchema);
    const node = getNodeByPointer(newSchema, path);
    node.enum = node.enum ?? [];
    if (oldValue === null || oldValue === undefined) node.enum.push(value);
    if (node.enum.includes(oldValue)) node.enum[node.enum.indexOf(oldValue)] = value;
    if (!node.enum.includes(value)) node.enum.push(value);
    return newSchema;
  };

export type AddRootItemArgs = {
  location: string;
  name: string;
  props: Partial<UiSchemaNode>;
  callback: (pointer: string) => void;
};
export const addRootItem: UiSchemaReducer<AddRootItemArgs> =
  (uiSchema: UiSchemaNodes, { location, name, props, callback }) => {
    const newSchema = deepCopy(uiSchema);
    const newPointer = getUniqueNodePath(newSchema, [location, name].join('/'));
    const newNode = createNodeBase(newPointer);
    newNode.implicitType = false;
    newSchema.push(Object.assign(newNode, props));
    getNodeByPointer(newSchema, ROOT_POINTER).children.push(newPointer);
    callback(newPointer);
    return newSchema;
  };

export type AddPropertyArgs = {
  pointer: string;
  props: Partial<UiSchemaNode>;
  callback?: (pointer: string) => void;
};
export const addProperty: UiSchemaReducer<AddPropertyArgs> =
  (uiSchema: UiSchemaNodes, { pointer, props, callback }) => {
    const newSchema = deepCopy(uiSchema);
    const addToNode = getNodeByPointer(newSchema, pointer);
    const pointerBase = addToNode.isArray
      ? makePointer(addToNode.pointer, Keyword.Items)
      : addToNode.pointer;
    const newNodePointer = getUniqueNodePath(
      newSchema,
      makePointer(pointerBase, Keyword.Properties, 'name')
    );
    addToNode.children.push(newNodePointer);
    callback && callback(newNodePointer);
    props.implicitType = false;
    newSchema.push(Object.assign(createNodeBase(newNodePointer), props));
    return newSchema;
  };

export type DeleteEnumValueArgs = {
  path: string;
  value: string;
};
export const deleteEnumValue: UiSchemaReducer<DeleteEnumValueArgs> =
  (uiSchema: UiSchemaNodes, { path, value }) => {
    const newSchema = deepCopy(uiSchema);
    const enumItem = getNodeByPointer(newSchema, path);
    enumItem.enum = removeItemByValue(enumItem.enum, value);
    return newSchema;
  };

export const promoteProperty: UiSchemaReducer<string> =
  (uiSchema, path) => convertPropToType(deepCopy(uiSchema), path);

export const deleteNode: UiSchemaReducer<string> =
  (uiSchema, path) => removeNodeByPointer(deepCopy(uiSchema), path);

export type SetRestrictionArgs = {
  path: string;
  key: string;
  value?: string | boolean;
};
export const setRestriction: UiSchemaReducer<SetRestrictionArgs> =
  (uiSchema, { path, key, value }) => {
    const newSchema = deepCopy(uiSchema);
    const schemaItem = getNodeByPointer(newSchema, path);
    const restrictions = { ...schemaItem.restrictions };
    restrictions[key] = castRestrictionType(key, value);
    Object.keys(restrictions).forEach((k) => {
      if (restrictions[k] === undefined) {
        delete restrictions[k];
      }
    });
    schemaItem.restrictions = restrictions;
    return newSchema;
  };

export type SetRestrictionsArgs = {
  path: string;
  restrictions: KeyValuePairs;
};
export const setRestrictions: UiSchemaReducer<SetRestrictionsArgs> =
  (uiSchema, { path, restrictions }) => {
    const newSchema = deepCopy(uiSchema);
    const schemaItem = getNodeByPointer(newSchema, path);
    const schemaItemRestrictions = { ...schemaItem.restrictions };
    Object.keys(restrictions).forEach((key) => {
      schemaItemRestrictions[key] = castRestrictionType(key, restrictions[key]);
    });
    Object.keys(schemaItemRestrictions).forEach((k) => {
      if (schemaItemRestrictions[k] === undefined) {
        delete schemaItemRestrictions[k];
      }
    });
    schemaItem.restrictions = schemaItemRestrictions;
    return newSchema;
  };

export type SetRefArgs = {
  path: string;
  ref: string;
};
export const setRef: UiSchemaReducer<SetRefArgs> =
  (uiSchema, { path, ref }) => {
    const newSchema = deepCopy(uiSchema);
    const referredNode = getNodeByPointer(newSchema, ref);
    const uiSchemaNode = getNodeByPointer(newSchema, path);
    uiSchemaNode.reference = ref;
    uiSchemaNode.objectKind = ObjectKind.Reference;
    uiSchemaNode.fieldType = referredNode.fieldType;
    uiSchemaNode.implicitType = true;
    return newSchema;
  };

export type SetTypeArgs = {
  path: string;
  type: FieldType;
};
export const setType: UiSchemaReducer<SetTypeArgs> =
  (uiSchema, { path, type }) => {
    const newSchema = deepCopy(uiSchema);
    const uiSchemaNode = getNodeByPointer(newSchema, path);
    uiSchemaNode.reference = undefined;
    uiSchemaNode.children = [];
    uiSchemaNode.fieldType = type;
    uiSchemaNode.implicitType = false;
    return newSchema;
  };

export type SetTitleArgs = {
  path: string;
  title: string;
};
export const setTitle: UiSchemaReducer<SetTitleArgs> =
  (uiSchema, { path, title }) => {
    const newSchema = deepCopy(uiSchema);
    getNodeByPointer(newSchema, path).title = title;
    return newSchema;
  };

export type SetDescriptionArgs = {
  path: string;
  description: string;
};
export const setDescription: UiSchemaReducer<SetDescriptionArgs> =
  (uiSchema, { path, description }) => {
    const newSchema = deepCopy(uiSchema);
    getNodeByPointer(newSchema, path).description = description;
    return newSchema;
  };

export type SetRequiredArgs = {
  path: string;
  required: boolean;
};
export const setRequired: UiSchemaReducer<SetRequiredArgs> =
  (uiSchema, { path, required }) => {
    const newSchema = deepCopy(uiSchema);
    getNodeByPointer(newSchema, path).isRequired = required;
    return newSchema;
  };

export type SetCustomPropertiesArgs = {
  path: string;
  properties: KeyValuePairs;
};
export const setCustomProperties: UiSchemaReducer<SetCustomPropertiesArgs> =
  (uiSchema, { path, properties }) => {
    const newSchema = deepCopy(uiSchema);
    const uiSchemaNode = getNodeByPointer(newSchema, path);
    uiSchemaNode.custom = properties;
    return newSchema;
  };

export type SetCombinationTypeArgs = {
  path: string;
  type: CombinationKind;
};
export const setCombinationType: UiSchemaReducer<SetCombinationTypeArgs> =
  (uiSchema, { path, type }) => {
    const newSchema = deepCopy(uiSchema);
    const uiSchemaNode = getNodeByPointer(newSchema, path);
    const oldPointer = [path, uiSchemaNode.fieldType].join('/');
    const newPointer = [path, type].join('/');
    uiSchemaNode.fieldType = type;
    return renameNodePointer(newSchema, oldPointer, newPointer);
  };

export type AddCombinationItemArgs = {
  pointer: string;
  props: Partial<UiSchemaNode>;
  callback: (pointer: string) => void;
};
export const addCombinationItem: UiSchemaReducer<AddCombinationItemArgs> =
  (uiSchema, { pointer, props, callback }) => {
    const newSchema = deepCopy(uiSchema);
    const node = getNodeByPointer(newSchema, pointer);
    const item = Object.assign(
      createNodeBase(pointer, node.fieldType, node.children.length.toString()),
      props
    );
    item.isCombinationItem = true;
    node.children.push(item.pointer);
    newSchema.push(item);
    callback(item.pointer);
    return newSchema;
  };

export type SetPropertyNameArgs = {
  path: string;
  name: string;
  callback: (pointer: string) => void;
};
export const setPropertyName: UiSchemaReducer<SetPropertyNameArgs> =
  (uiSchema, { path, name, callback }) => {
    if (!name || name.length === 0) {
      return uiSchema;
    }
    const newSchema = deepCopy(uiSchema);
    const nodeToRename = getNodeByPointer(newSchema, path);
    const oldPointer = nodeToRename.pointer;
    const newPointer = replaceLastPointerSegment(oldPointer, name);
    callback(newPointer);
    return renameNodePointer(newSchema, nodeToRename.pointer, newPointer);
  };


// update the "children" pointers 
//include items in the pointer path if isArray is toggled on, or
// remove items from the pointer path if isArray is toggled off. 
// if isArray is toggled on, add items to the pointer path
export const toggleArrayField: UiSchemaReducer<string> = (uiSchema, pointer) => {
  const newSchema = deepCopy(uiSchema);
  const node = getNodeByPointer(newSchema, pointer);
  node.isArray = !node.isArray;

  if (node.isArray) {
    node.children.forEach((child) => {
      const childNode = getNodeByPointer(newSchema, child);
      childNode.pointer.replace(childNode.pointer, makePointer(
        childNode.pointer, Keyword.Items));
    });
  } else {
    node.children.forEach((child) => {
      const childNode = getNodeByPointer(newSchema, child);
      // childNode.pointer = childNode.pointer.replace('/items/properties/', '/properties/group');

    });
  }

  return newSchema;
};



export type ChangeChildrenOrderArgs = {
  pointerA: string;
  pointerB: string;
};
export const changeChildrenOrder: UiSchemaReducer<ChangeChildrenOrderArgs> =
  (uiSchema, { pointerA, pointerB }) => {
    const { base: baseA } = splitPointerInBaseAndName(pointerA);
    const { base: baseB } = splitPointerInBaseAndName(pointerB);
    if (baseA !== baseB) return uiSchema;
    const newSchema = deepCopy(uiSchema);
    const parentNode = getParentNodeByPointer(newSchema, pointerA);
    if (parentNode) parentNode.children = swapArrayElements(parentNode.children, pointerA, pointerB);
    return newSchema;
  };

