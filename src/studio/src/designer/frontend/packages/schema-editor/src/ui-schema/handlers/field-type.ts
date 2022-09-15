import { FieldType } from '../../types';
import { ObjectKind } from '../../types/enums';
import { JsonSchemaNode, UiSchemaNode } from '../types';
import { getCombinationKind, getObjectKind } from '../utils';

export const isCompundFieldType = (schemaNodeType: string | string[]) =>
  Array.isArray(schemaNodeType) && schemaNodeType.length === 2;

export const getUiFieldType = (schemaNode: JsonSchemaNode) => {
  const objectKind = getObjectKind(schemaNode);
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
  } else {
    return undefined;
  }
};

export const getJsonFieldType = (uiNode: UiSchemaNode) => {
  // Setting Type for fields
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
