import type { JsonSchemaNode } from '../types';
import { CombinationKind, Keywords } from '../types';
import { AllRestrictions } from '../restrictions';
import { META_SCHEMA_ID } from '../constants';

const specialAttributes = [
  ...Object.values(Keywords),
  ...Object.values(CombinationKind),
  ...Object.values(AllRestrictions),
] as string[];

// Deals with custom properties... or really what properties that we not know about.
export const findCustomAttributes = (schemaNode: JsonSchemaNode) => {
  const outout: JsonSchemaNode = {};
  Object.keys(schemaNode).forEach((key) => {
    if (!specialAttributes.includes(key)) {
      outout[key] = schemaNode[key];
    }
    if (key === '$schema') {
      outout[key] = META_SCHEMA_ID;
    }
  });
  return outout;
};
