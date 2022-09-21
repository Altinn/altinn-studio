import { JsonSchemaNode } from '../types';
import { AllRestrictions } from '../restrictions';

/**
 * Handling restrictions
 * @param schemaNode
 */
export const handleRestrictions = (schemaNode: JsonSchemaNode): JsonSchemaNode => {
  const restrictions: JsonSchemaNode = {};
  Object.values(AllRestrictions).forEach((key) => {
    if (schemaNode[key] !== undefined) {
      restrictions[key] = schemaNode[key];
    }
  });
  return restrictions;
};
