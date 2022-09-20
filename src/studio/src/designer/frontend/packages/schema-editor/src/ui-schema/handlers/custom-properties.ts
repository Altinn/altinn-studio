import { CombinationKind } from '../../types';
import { JsonSchemaNode, Keywords } from '../types';
import { AllRestrictions } from '../../utils/restrictions';

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
