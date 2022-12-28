import type { Dict } from '../types';
import { CombinationKind, Keywords, UnhandledKeywords } from '../types';
import { AllRestrictions } from '../restrictions';
import { META_SCHEMA_ID } from '../constants';

const specialAttributes = [
  ...Object.values(Keywords),
  ...Object.values(CombinationKind),
  ...Object.values(AllRestrictions),
] as string[];

// Deals with custom properties... or really what properties that we not know about.
export const findCustomAttributes = (schemaNode: Dict) => {
  const outout: Dict = {};
  Object.keys(schemaNode).forEach((key) => {
    if (!specialAttributes.includes(key)) {
      outout[key] = schemaNode[key];
    }
    if (key === UnhandledKeywords.Schema) {
      outout[key] = META_SCHEMA_ID;
    }
  });
  return outout;
};
