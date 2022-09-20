import { FieldType } from '../types';

export enum IntegerRestrictions {
  exclusiveMaximum = 'exclusiveMaximum',
  exclusiveMinimum = 'exclusiveMinimum',
  maximum = 'maximum',
  minimum = 'minimum',
  multipleOf = 'multipleOf',
}

export enum StringRestrictions {
  format = 'format',
  maxLength = 'maxLength',
  minLength = 'minLength',
  pattern = 'pattern',
}

export enum ObjectRestrictions {
  maxProperties = 'maxProperties',
  minProperties = 'minProperties',
}
export enum ArrayRestrictions {
  maxItems = 'maxItems',
  minItems = 'minItems',
  uniqueItems = 'uniqueItems',
}
export const AllRestrictions = {
  ...ArrayRestrictions,
  ...IntegerRestrictions,
  ...ObjectRestrictions,
  ...StringRestrictions,
};

const restrictionMap: Map<string, string[]> = new Map([
  [FieldType.String, [...Object.values(StringRestrictions)]],
  [FieldType.Integer, [...Object.values(IntegerRestrictions)]],
  [FieldType.Number, [...Object.values(IntegerRestrictions)]],
  [FieldType.Object, [...Object.values(ObjectRestrictions)]],
  [FieldType.Array, [...Object.values(ArrayRestrictions)]],
]);

export const getRestrictions = (type: FieldType): string[] =>
  restrictionMap.get(type) ?? [];
