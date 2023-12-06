import type { UiSchemaNode } from '@altinn/schema-model';
import { FieldType, isCombination, isField, isReference } from '@altinn/schema-model';

export const getIconStr = (item: UiSchemaNode) => {
  const { isArray } = item;
  if (!isArray && isReference(item)) {
    return 'fa-datamodel-ref';
  } else if (isCombination(item)) {
    return 'fa-group';
  } else if (isField(item)) {
    switch (item.fieldType) {
      case FieldType.Boolean:
        return 'fa-datamodel-boolean';
      case FieldType.Number:
      case FieldType.Integer:
        return 'fa-datamodel-number';
      case FieldType.String:
        return 'fa-datamodel-string';
      case FieldType.Null:
        return 'fa-datamodel-null';
      case FieldType.Object:
        return 'fa-datamodel-object';
      default:
        return 'fa-help-circle';
    }
  } else {
    return 'fa-help-circle';
  }
};
