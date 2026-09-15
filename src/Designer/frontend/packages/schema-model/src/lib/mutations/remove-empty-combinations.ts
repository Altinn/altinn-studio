import type { UiSchemaNodes } from '../../types';
import { SchemaModel } from '../SchemaModel';
import { isEmptyCombination } from '../utils';

/**
 * Returns a copy of the given nodes without combinations that have no subschemas, and without
 * references to them. The editor keeps such combinations while the user is working on them, but
 * they cannot be part of a valid JSON schema. A combination that becomes empty because its only
 * subschemas were removed this way is removed as well.
 */
export const removeEmptyCombinations = (nodes: UiSchemaNodes): UiSchemaNodes => {
  const model = SchemaModel.fromArray(nodes).deepClone();
  let emptyCombination = model.asArray().find(isEmptyCombination);
  while (emptyCombination) {
    deleteNodeWithReferences(model, emptyCombination.schemaPointer);
    emptyCombination = model.asArray().find(isEmptyCombination);
  }
  return model.asArray();
};

const deleteNodeWithReferences = (model: SchemaModel, schemaPointer: string): void => {
  // Deleting a reference renumbers the subschemas of its parent combination, so the referring nodes
  // must be resolved again between deletions rather than up front.
  let referringNode = model.getReferringNodes(schemaPointer)[0];
  while (referringNode) {
    model.deleteNode(referringNode.schemaPointer);
    referringNode = model.getReferringNodes(schemaPointer)[0];
  }
  model.deleteNode(schemaPointer);
};
