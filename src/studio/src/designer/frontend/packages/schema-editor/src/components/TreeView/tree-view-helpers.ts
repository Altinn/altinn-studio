import { FieldType, ISchemaState, UiSchemaItem } from '../../types';

export const getIconStr = (item: UiSchemaItem) => {
  const { type } = item;
  if (type !== FieldType.Array && item.$ref !== undefined) {
    return 'fa-datamodel-ref';
  } else if (item.combination) {
    return 'fa-group';
  } else if (type === FieldType.Integer) {
    return 'fa-datamodel-number';
  } else if (type === FieldType.Null) {
    return 'fa-datamodel-object';
  } else {
    return type ? `fa-datamodel-${type}` : 'fa-datamodel-object';
  }
};

export const createRefSelector = (refPointer?: string) => {
  return (state: ISchemaState) => {
    if (refPointer) {
      return state.uiSchema.find((item) => item.path === refPointer);
    }
    return undefined;
  };
};
