import { AllRestrictions } from '../restrictions';
import { CombinationKind, JsonSchemaNode, Keywords } from '../types';

const specialAttributes = [
  ...Object.values(Keywords),
  ...Object.values(CombinationKind),
  ...Object.values(AllRestrictions),
] as string[];

// Deals with custom properties... or really what properties that we not know about.
export const handleCustomProperties = (schemaNode: JsonSchemaNode) => {
  const outout: JsonSchemaNode = {};
  Object.keys(schemaNode).forEach((key) => {
    if (!specialAttributes.includes(key)) {
      outout[key] = schemaNode[key];
    }
  });
  return outout;
};
