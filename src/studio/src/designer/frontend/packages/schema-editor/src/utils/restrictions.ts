import { FieldType } from '../types';

export enum IntAttribs {
  exclusiveMaximum = 'exclusiveMaximum',
  exclusiveMinimum = 'exclusiveMinimum',
  maximum = 'maximum',
  minimum = 'minimum',
}

export enum StrAttribs {
  format = 'format',
  maxLength = 'maxLength',
  minLength = 'minLength',
  pattern = 'pattern',
}

export enum ObjAttribs {
  maxProperties = 'maxProperties',
  minProperties = 'minProperties',
}
export enum ArrAttribs {
  maxItems = 'maxItems',
  minItems = 'minItems',
  uniqueItems = 'uniqueItems',
}
export const AllAttribs = {
  ...ArrAttribs,
  ...IntAttribs,
  ...ObjAttribs,
  ...StrAttribs,
};

const restrictionMap: Map<string, string[]> = new Map([
  [FieldType.String, [...Object.values(StrAttribs)]],
  [FieldType.Integer, [...Object.values(IntAttribs)]],
  [FieldType.Number, [...Object.values(IntAttribs)]],
  [FieldType.Object, [...Object.values(ObjAttribs)]],
  [FieldType.Array, [...Object.values(ArrAttribs)]],
]);

export const getRestrictions = (type: FieldType) => restrictionMap.get(type);
