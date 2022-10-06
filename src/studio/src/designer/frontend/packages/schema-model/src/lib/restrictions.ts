import { FieldType, JsonSchemaNode } from './types';

export enum IntRestrictionKeys {
  maximum = 'maximum',
  minimum = 'minimum',
  multipleOf = 'multipleOf',
}

export enum StrRestrictionKeys {
  maxLength = 'maxLength',
  minLength = 'minLength',
  pattern = 'pattern',
}

export enum ObjRestrictionKeys {}

export enum ArrRestrictionKeys {
  maxItems = 'maxItems',
  minItems = 'minItems',
  uniqueItems = 'uniqueItems',
}

export const AllRestrictions = {
  ...ArrRestrictionKeys,
  ...IntRestrictionKeys,
  ...ObjRestrictionKeys,
  ...StrRestrictionKeys,
};

const restrictionMap: Map<string, string[]> = new Map([
  [FieldType.String, [...Object.values(StrRestrictionKeys)]],
  [FieldType.Integer, [...Object.values(IntRestrictionKeys)]],
  [FieldType.Number, [...Object.values(IntRestrictionKeys)]],
  [FieldType.Object, [...Object.values(ObjRestrictionKeys)]],
  [FieldType.Array, [...Object.values(ArrRestrictionKeys)]],
]);

export const getRestrictions = (type: FieldType): string[] => restrictionMap.get(type) ?? [];

export const findRestrictionsOnNode = (schemaNode: JsonSchemaNode): JsonSchemaNode => {
  const restrictions: JsonSchemaNode = {};
  Object.values(AllRestrictions).forEach((key) => {
    if (schemaNode[key] !== undefined) {
      restrictions[key] = schemaNode[key];
    }
  });
  return restrictions;
};

export const castRestrictionType = (key: string, value: string) => {
  if (value === '') {
    return undefined;
  } else if (
    [
      ArrRestrictionKeys.maxItems,
      ArrRestrictionKeys.minItems,
      IntRestrictionKeys.maximum,
      IntRestrictionKeys.minimum,
      IntRestrictionKeys.multipleOf,
      StrRestrictionKeys.maxLength,
      StrRestrictionKeys.minLength,
    ].includes(key as ArrRestrictionKeys & StrRestrictionKeys & StrRestrictionKeys)
  ) {
    return parseInt(value);
  } else if ([ArrRestrictionKeys.uniqueItems].includes(key as ArrRestrictionKeys)) {
    return value;
  } else {
    return value;
  }
};
