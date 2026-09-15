import { hasEmptyCombination } from './has-empty-combination';
import type { JsonSchema } from 'app-shared/types/JsonSchema';

describe('hasEmptyCombination', () => {
  const text = { type: 'string' };

  it('Returns false for a schema without combinations', () => {
    const schema: JsonSchema = { type: 'object', properties: { text } };
    expect(hasEmptyCombination(schema)).toBe(false);
  });

  it('Returns false when all combinations have subschemas', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: { combination: { anyOf: [text, { type: 'number' }] } },
    };
    expect(hasEmptyCombination(schema)).toBe(false);
  });

  it('Returns true for a combination without subschemas in a property', () => {
    const schema: JsonSchema = { type: 'object', properties: { combination: { anyOf: [] } } };
    expect(hasEmptyCombination(schema)).toBe(true);
  });

  it('Returns true for a combination without subschemas in a definition', () => {
    const schema: JsonSchema = { type: 'object', $defs: { Choice: { oneOf: [] } } };
    expect(hasEmptyCombination(schema)).toBe(true);
  });

  it('Returns true for a combination without subschemas nested in another combination', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: { combination: { anyOf: [text, { allOf: [] }] } },
    };
    expect(hasEmptyCombination(schema)).toBe(true);
  });

  it('Returns true for a combination without subschemas in array items', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: { list: { type: 'array', items: { anyOf: [] } } },
    };
    expect(hasEmptyCombination(schema)).toBe(true);
  });

  it('Returns true when the root itself is a combination without subschemas', () => {
    expect(hasEmptyCombination({ anyOf: [] })).toBe(true);
  });

  it('Does not fail on null values', () => {
    const schema: JsonSchema = { type: 'object', properties: { text: { default: null } } };
    expect(hasEmptyCombination(schema)).toBe(false);
  });
});
