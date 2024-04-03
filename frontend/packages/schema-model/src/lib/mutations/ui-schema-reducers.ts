import type { CombinationKind, NodePosition, UiSchemaReducer } from '../../types';
import { FieldType } from '../../types';
import { isField, isReference, splitPointerInBaseAndName } from '../utils';
import { convertPropToType } from './convert-node';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import { castRestrictionType } from '../restrictions';
import { swapArrayElements } from 'app-shared/utils/arrayUtils';
import { changeNameInPointer } from '../pointerUtils';

export const promoteProperty: UiSchemaReducer<string> = (uiSchema, path) => {
  const newSchema = uiSchema.deepClone();
  return convertPropToType(newSchema, path);
};

export const deleteNode: UiSchemaReducer<string> = (uiSchema, path) => {
  const newSchema = uiSchema.deepClone();
  newSchema.deleteNode(path);
  return newSchema;
};

export type SetRestrictionArgs = {
  path: string;
  key: string;
  value?: string | boolean;
};
export const setRestriction: UiSchemaReducer<SetRestrictionArgs> = (
  uiSchema,
  { path, key, value },
) => {
  const newSchema = uiSchema.deepClone();
  const schemaItem = newSchema.getNode(path);
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
export const setRestrictions: UiSchemaReducer<SetRestrictionsArgs> = (
  uiSchema,
  { path, restrictions },
) => {
  const newSchema = uiSchema.deepClone();
  const schemaItem = newSchema.getNode(path);
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
export const setRef: UiSchemaReducer<SetRefArgs> = (uiSchema, { path, ref }) => {
  const newSchema = uiSchema.deepClone();
  const uiSchemaNode = newSchema.getNode(path);
  if (isReference(uiSchemaNode)) {
    uiSchemaNode.reference = ref;
    uiSchemaNode.implicitType = true;
  }
  return newSchema;
};

export type SetTypeArgs = {
  path: string;
  type: FieldType;
};
export const setType: UiSchemaReducer<SetTypeArgs> = (uiSchema, { path, type }) => {
  const newSchema = uiSchema.deepClone();
  const uiSchemaNode = newSchema.getNode(path);
  if (isField(uiSchemaNode)) {
    uiSchemaNode.children = [];
    uiSchemaNode.fieldType = type;
    uiSchemaNode.implicitType = false;
  }
  return newSchema;
};

export type SetTitleArgs = {
  path: string;
  title: string;
};
export const setTitle: UiSchemaReducer<SetTitleArgs> = (uiSchema, { path, title }) => {
  const newSchema = uiSchema.deepClone();
  newSchema.getNode(path).title = title;
  return newSchema;
};

export type SetDescriptionArgs = {
  path: string;
  description: string;
};
export const setDescription: UiSchemaReducer<SetDescriptionArgs> = (
  uiSchema,
  { path, description },
) => {
  const newSchema = uiSchema.deepClone();
  newSchema.getNode(path).description = description;
  return newSchema;
};

export type SetRequiredArgs = {
  path: string;
  required: boolean;
};
export const setRequired: UiSchemaReducer<SetRequiredArgs> = (uiSchema, { path, required }) => {
  const newSchema = uiSchema.deepClone();
  newSchema.getNode(path).isRequired = required;
  return newSchema;
};

export type SetCustomPropertiesArgs = {
  path: string;
  properties: KeyValuePairs;
};
export const setCustomProperties: UiSchemaReducer<SetCustomPropertiesArgs> = (
  uiSchema,
  { path, properties },
) => {
  const newSchema = uiSchema.deepClone();
  newSchema.getNode(path).custom = properties;
  return newSchema;
};

export type SetCombinationTypeArgs = {
  path: string;
  type: CombinationKind;
};
export const setCombinationType: UiSchemaReducer<SetCombinationTypeArgs> = (
  uiSchema,
  { path, type },
) => {
  const newSchema = uiSchema.deepClone();
  newSchema.changeCombinationType(path, type);
  return newSchema;
};

export type AddCombinationItemArgs = {
  pointer: string;
  callback: (pointer: string) => void;
};
export const addCombinationItem: UiSchemaReducer<AddCombinationItemArgs> = (
  uiSchema,
  { pointer, callback },
) => {
  const newSchema = uiSchema.deepClone();
  const target: NodePosition = { parentPointer: pointer, index: -1 };
  const newNode = newSchema.addField(undefined, FieldType.Null, target);
  callback(newNode.pointer);
  return newSchema;
};

export type SetPropertyNameArgs = {
  path: string;
  name: string;
  callback?: (pointer: string) => void;
};
export const setPropertyName: UiSchemaReducer<SetPropertyNameArgs> = (
  uiSchema,
  { path, name, callback },
) => {
  if (!name || name.length === 0) {
    return uiSchema;
  }
  const newSchema = uiSchema.deepClone();
  const nodeToRename = newSchema.getNode(path);
  const newPointer = changeNameInPointer(path, name);
  const newNode = { ...nodeToRename, pointer: newPointer };
  newSchema.updateNode(path, newNode);
  callback?.(newPointer);
  return newSchema;
};

export const toggleArrayField: UiSchemaReducer<string> = (uiSchema, pointer) => {
  const newSchema = uiSchema.deepClone();
  newSchema.toggleIsArray(pointer);
  return newSchema;
};

export type ChangeChildrenOrderArgs = {
  pointerA: string;
  pointerB: string;
};
export const changeChildrenOrder: UiSchemaReducer<ChangeChildrenOrderArgs> = (
  uiSchema,
  { pointerA, pointerB },
) => {
  const { base: baseA } = splitPointerInBaseAndName(pointerA);
  const { base: baseB } = splitPointerInBaseAndName(pointerB);
  if (baseA !== baseB) return uiSchema;
  const newSchema = uiSchema.deepClone();
  const parentNode = newSchema.getParentNode(pointerA);
  if (parentNode) parentNode.children = swapArrayElements(parentNode.children, pointerA, pointerB);
  return newSchema;
};
