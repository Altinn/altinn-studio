import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import { CombinationKind, Keyword, UnhandledKeyword } from '../../types';
import { AllRestrictions } from '../restrictions';
import { META_SCHEMA_ID } from '../constants';

const specialAttributes = [
  ...Object.values(Keyword),
  ...Object.values(CombinationKind),
  ...Object.values(AllRestrictions),
] as string[];

// Deals with custom properties... or really what properties that we not know about.
export const findCustomAttributes = (schemaNode: KeyValuePairs) => {
  const outout: KeyValuePairs = {};
  Object.keys(schemaNode).forEach((key) => {
    if (!specialAttributes.includes(key)) {
      outout[key] = schemaNode[key];
    }
    if (key === UnhandledKeyword.Schema) {
      outout[key] = META_SCHEMA_ID;
    }
  });
  return outout;
};
