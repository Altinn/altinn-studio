import { FieldType, ObjectKind, UiSchemaNode } from '@altinn/schema-model';

export const getIconStr = (item: UiSchemaNode) => {
  const { fieldType } = item;
  if (fieldType !== FieldType.Array && item.ref !== undefined) {
    return 'fa-datamodel-ref';
  } else if (item.objectKind === ObjectKind.Combination) {
    return 'fa-group';
  } else if (fieldType === FieldType.Integer) {
    return 'fa-datamodel-number';
  } else if (fieldType === FieldType.Null) {
    return 'fa-datamodel-null';
  } else if (fieldType === undefined) {
    return 'fa-help-circle';
  } else {
    return fieldType ? `fa-datamodel-${fieldType}` : 'fa-help-circle';
  }
};
