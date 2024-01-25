import { valueExists } from '@altinn/schema-editor/utils/value';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import {
  ArrRestrictionKey,
  IntRestrictionKey,
  ObjRestrictionKey,
  StrRestrictionKey,
} from '../types';

export const AllRestrictions = {
  ...ArrRestrictionKey,
  ...IntRestrictionKey,
  ...ObjRestrictionKey,
  ...StrRestrictionKey,
};

export const findRestrictionsOnNode = (schemaNode: KeyValuePairs): KeyValuePairs => {
  const restrictions: KeyValuePairs = {};
  Object.values(AllRestrictions).forEach((key) => {
    if (schemaNode[key] !== undefined) {
      restrictions[key] = schemaNode[key];
    }
  });
  return restrictions;
};

export const castRestrictionType = (key: string, value?: string | boolean) => {
  if (!valueExists(value)) {
    return undefined;
  } else if (
    [
      ArrRestrictionKey.maxItems,
      ArrRestrictionKey.minItems,
      IntRestrictionKey.exclusiveMaximum,
      IntRestrictionKey.exclusiveMinimum,
      IntRestrictionKey.maximum,
      IntRestrictionKey.minimum,
      IntRestrictionKey.multipleOf,
      StrRestrictionKey.maxLength,
      StrRestrictionKey.minLength,
    ].includes(key as ArrRestrictionKey & StrRestrictionKey & IntRestrictionKey)
  ) {
    return parseInt(value.toString());
  } else {
    return value;
  }
};
