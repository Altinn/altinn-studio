import type { JsonSchemaNode } from '../types';
import { CombinationKind, Keywords } from '../types';
import { AllRestrictions } from '../restrictions';

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
  });
  return outout;
};
