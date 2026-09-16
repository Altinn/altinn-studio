import type { UiSchemaNodes } from '../../types';
import type { JsonSchema } from 'app-shared/types/JsonSchema';
import { CombinationKind } from '../../types/CombinationKind';
import { SchemaModel } from '../SchemaModel';
import { buildJsonSchema } from '../build-json-schema';
import { buildUiSchema } from '../build-ui-schema';
import { isEmptyCombination } from '../utils';

/**
 * Returns the given JSON schema without combinations that have no subschemas. The editor keeps such
 * combinations while the user is working on them, but they cannot be part of a valid JSON schema.
 * The schema is returned unchanged when there is nothing to remove.
 */
export const removeEmptyCombinations = (schema: JsonSchema): JsonSchema => {
  // This runs on every autosave, and scanning the raw schema is much cheaper than converting it.
  if (!hasEmptyCombination(schema)) return schema;
  // The raw scan only gives an upper bound, so the nodes decide whether there is anything to remove.
  const nodes = buildUiSchema(schema);
  if (!nodes.some(isEmptyCombination)) return schema;
  return buildJsonSchema(removeEmptyCombinationsFromSchemaNodes(nodes));
};

/**
 * Tells whether the given JSON schema contains a combination keyword with an empty list of
 * subschemas. It walks the raw schema instead of building a UI schema from it, so that the common
 * case - a schema without empty combinations - is answered without the cost of a conversion.
 *
 * Keywords like `const` and `default` hold arbitrary JSON, so the answer is an upper bound: it is
 * never false when the schema has an empty combination, but it can be true when a value merely
 * looks like one.
 */
export const hasEmptyCombination = (schema: JsonSchema): boolean => {
  if (!isNonNullObject(schema)) return false;
  // Arrays are objects, so their items are walked as well, keyed by their index.
  return Object.entries(schema).some(
    ([keyword, value]) => isEmptyCombinationKeyword(keyword, value) || hasEmptyCombination(value),
  );
};

/**
 * Returns a copy of the given nodes without combinations that have no subschemas, and without
 * references to them. Removal happens on nodes, which know about parents, references and required
 * lists, so whatever pointed at a removed combination is cleaned up too. A combination that becomes
 * empty because its only subschemas were removed this way is removed as well.
 */
const removeEmptyCombinationsFromSchemaNodes = (nodes: UiSchemaNodes): UiSchemaNodes => {
  const model = SchemaModel.fromArray(nodes).deepClone();
  let emptyCombination = model.asArray().find(isEmptyCombination);
  while (emptyCombination) {
    deleteNodeWithReferences(model, emptyCombination.schemaPointer);
    emptyCombination = model.asArray().find(isEmptyCombination);
  }
  return model.asArray();
};

const combinationKeywords: string[] = Object.values(CombinationKind);

const isEmptyCombinationKeyword = (keyword: string, value: unknown): boolean =>
  combinationKeywords.includes(keyword) && Array.isArray(value) && value.length === 0;

const isNonNullObject = (value: unknown): value is object =>
  typeof value === 'object' && value !== null;

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
