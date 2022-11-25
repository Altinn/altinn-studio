import type { Dict } from './types';

export enum IntRestrictionKeys {
  exclusiveMaximum = 'exclusiveMaximum',
  exclusiveMinimum = 'exclusiveMinimum',
  maximum = 'maximum',
  minimum = 'minimum',
  multipleOf = 'multipleOf',
}

export enum StrRestrictionKeys {
  format = 'format',
  formatExclusiveMaximum = 'formatExclusiveMaximum',
  formatExclusiveMinimum = 'formatExclusiveMinimum',
  formatMaximum = 'formatMaximum',
  formatMinimum = 'formatMinimum',
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

export const findRestrictionsOnNode = (schemaNode: Dict): Dict => {
  const restrictions: Dict = {};
  Object.values(AllRestrictions).forEach((key) => {
    if (schemaNode[key] !== undefined) {
      restrictions[key] = schemaNode[key];
    }
  });
  return restrictions;
};

export const castRestrictionType = (key: string, value?: string) => {
  if (!value) {
    return undefined;
  } else if (
    [
      ArrRestrictionKeys.maxItems,
      ArrRestrictionKeys.minItems,
      IntRestrictionKeys.exclusiveMaximum,
      IntRestrictionKeys.exclusiveMinimum,
      IntRestrictionKeys.maximum,
      IntRestrictionKeys.minimum,
      IntRestrictionKeys.multipleOf,
      StrRestrictionKeys.maxLength,
      StrRestrictionKeys.minLength,
    ].includes(key as ArrRestrictionKeys & StrRestrictionKeys & IntRestrictionKeys)
  ) {
    return parseInt(value);
  } else if ([ArrRestrictionKeys.uniqueItems].includes(key as ArrRestrictionKeys)) {
    return value;
  } else {
    return value;
  }
};
