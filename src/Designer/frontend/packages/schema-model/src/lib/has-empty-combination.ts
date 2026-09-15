import type { JsonSchema } from 'app-shared/types/JsonSchema';
import { CombinationKind } from '../types/CombinationKind';

const combinationKeywords: string[] = Object.values(CombinationKind);

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
    ([keyword, value]) => isEmptyCombination(keyword, value) || hasEmptyCombination(value),
  );
};

const isEmptyCombination = (keyword: string, value: unknown): boolean =>
  combinationKeywords.includes(keyword) && Array.isArray(value) && value.length === 0;

const isNonNullObject = (value: unknown): value is object =>
  typeof value === 'object' && value !== null;
