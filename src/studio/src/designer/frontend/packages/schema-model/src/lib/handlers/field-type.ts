import type { JsonSchemaNode, UiSchemaNode } from '../types';
import { FieldType, ObjectKind } from '../types';
import { arrayIntersection, arrayUnique, getCombinationKind, getObjectKind } from '../utils';
import { ArrRestrictionKeys, IntRestrictionKeys, ObjRestrictionKeys, StrRestrictionKeys } from '../restrictions';

export const isCompundFieldType = (schemaNodeType: string | string[]) =>
  Array.isArray(schemaNodeType) && schemaNodeType.length === 2;

export const findUiFieldType = (schemaNode: JsonSchemaNode) => {
  const objectKind = getObjectKind(schemaNode);
  const keys = Object.keys(schemaNode);
  if (typeof schemaNode.properties === 'object') {
    return FieldType.Object;
  } else if (typeof schemaNode.type === 'string' && objectKind === ObjectKind.Field) {
    return schemaNode.type;
  } else if (objectKind === ObjectKind.Combination) {
    const kind = getCombinationKind(schemaNode);
    return schemaNode.type ?? kind; // For some weird reason some combination items might have a type set, and apparently that is ok.
  } else if (objectKind === ObjectKind.Array) {
    return FieldType.Array;
  } else if (isCompundFieldType(schemaNode.type)) {
    // @see SeresNillable.json, we need to support types where stuff can be null.
    return schemaNode.type.filter((t: FieldType) => t !== FieldType.Null).pop();
  } else if (arrayIntersection(keys, Object.values(IntRestrictionKeys)).length) {
    return FieldType.Number;
  } else if (arrayIntersection(keys, Object.values(ArrRestrictionKeys)).length) {
    return FieldType.Boolean;
  } else if (arrayIntersection(keys, Object.values(StrRestrictionKeys)).length) {
    return FieldType.String;
  } else if (arrayIntersection(keys, Object.values(ObjRestrictionKeys)).length) {
    return FieldType.Object;
  } else if (Array.isArray(schemaNode.enum) && schemaNode.enum.length) {
    return findEnumFieldType(schemaNode.enum);
  } else {
    return undefined;
  }
};
export const findEnumFieldType = (nodeEnum: any[]) => {
  const checks = arrayUnique(nodeEnum.map((x: any) => typeof x));
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
  const { objectKind, isNillable, implicitType } = uiNode;
  let jsonFieldType;
  if (implicitType) {
    jsonFieldType = undefined;
  } else if (objectKind === ObjectKind.Field || objectKind === ObjectKind.Reference) {
    jsonFieldType = uiNode.fieldType;
  } else if (objectKind === ObjectKind.Array) {
    jsonFieldType = FieldType.Array;
  }
  if (typeof jsonFieldType === 'string' && isNillable && jsonFieldType !== FieldType.Null) {
    return [jsonFieldType, FieldType.Null];
  } else {
    return jsonFieldType;
  }
};
