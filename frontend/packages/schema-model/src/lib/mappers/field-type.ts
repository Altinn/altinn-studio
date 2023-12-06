import type { UiSchemaNode } from '../../types';
import {
  ArrRestrictionKey,
  FieldType,
  IntRestrictionKey,
  ObjRestrictionKey,
  ObjectKind,
  StrRestrictionKey,
} from '../../types';
import { getCombinationKind, getObjectKind, isField } from '../utils';
import { removeDuplicates, arrayIntersection } from 'app-shared/utils/arrayUtils';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';

export const isCompundFieldType = (schemaNodeType: string | string[]) =>
  Array.isArray(schemaNodeType) && schemaNodeType.length === 2;

export const findUiFieldType = (schemaNode: KeyValuePairs) => {
  const objectKind = getObjectKind(schemaNode);
  const keys = Object.keys(schemaNode);
  if (typeof schemaNode.properties === 'object') {
    return FieldType.Object;
  } else if (
    typeof schemaNode.type === 'string' &&
    [ObjectKind.Field, ObjectKind.Reference].includes(objectKind)
  ) {
    return schemaNode.type;
  } else if (objectKind === ObjectKind.Combination) {
    const kind = getCombinationKind(schemaNode);
    return schemaNode.type ?? kind; // For some weird reason some combination items might have a type set, and apparently that is ok.
  } else if (isCompundFieldType(schemaNode.type)) {
    // @see SeresNillable.json, we need to support types where stuff can be null.
    return schemaNode.type.filter((t: FieldType) => t !== FieldType.Null).pop();
  } else if (arrayIntersection(keys, Object.values(IntRestrictionKey)).length) {
    return FieldType.Number;
  } else if (arrayIntersection(keys, Object.values(ArrRestrictionKey)).length) {
    return FieldType.Boolean;
  } else if (arrayIntersection(keys, Object.values(StrRestrictionKey)).length) {
    return FieldType.String;
  } else if (arrayIntersection(keys, Object.values(ObjRestrictionKey)).length) {
    return FieldType.Object;
  } else if (Array.isArray(schemaNode.enum) && schemaNode.enum.length) {
    return findEnumFieldType(schemaNode.enum);
  } else {
    return undefined;
  }
};
export const findEnumFieldType = (nodeEnum: any[]) => {
  const checks = removeDuplicates(nodeEnum.map((x: any) => typeof x));
  if (checks.length === 1 && checks[0] === 'string') {
    return FieldType.String;
  }
  if (checks.length === 1 && checks[0] === 'object') {
    return FieldType.Object;
  }
  if (checks.length === 1 && checks[0] === 'number') {
    return FieldType.Number;
  }
  return undefined;
};

export const findJsonFieldType = (uiNode: UiSchemaNode) => {
  const { isNillable, implicitType } = uiNode;
  let jsonFieldType;
  if (implicitType) {
    jsonFieldType = undefined;
  } else if (isField(uiNode)) {
    jsonFieldType = uiNode.fieldType;
  }
  if (typeof jsonFieldType === 'string' && isNillable && jsonFieldType !== FieldType.Null) {
    return [jsonFieldType, FieldType.Null];
  } else {
    return jsonFieldType;
  }
};
