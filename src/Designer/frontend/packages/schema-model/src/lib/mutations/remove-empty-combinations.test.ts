import { hasEmptyCombination, removeEmptyCombinations } from './remove-empty-combinations';
import { buildUiSchema } from '../build-ui-schema';
import type { JsonSchema } from 'app-shared/types/JsonSchema';
import { validateTestUiSchema } from '../../../test/validateTestUiSchema';

// Removes the empty combinations and checks that the result is still a coherent schema.
const removeAndValidate = (schema: JsonSchema): JsonSchema => {
  const result = removeEmptyCombinations(schema);
  validateTestUiSchema(buildUiSchema(result));
  return JSON.parse(JSON.stringify(result));
};

describe('removeEmptyCombinations', () => {
  const text = { type: 'string' };

  it('Removes a combination without subschemas', () => {
    const schema: JsonSchema = { type: 'object', properties: { text, combination: { anyOf: [] } } };
    expect(removeAndValidate(schema)).toEqual({ type: 'object', properties: { text } });
  });

  it('Removes the combination from the required list of its parent', () => {
    const schema: JsonSchema = {
      type: 'object',
      required: ['text', 'combination'],
      properties: { text, combination: { anyOf: [] } },
    };
    expect(removeAndValidate(schema)).toEqual({
      type: 'object',
      required: ['text'],
      properties: { text },
    });
  });

  it('Renumbers the remaining subschemas when a nested combination is removed', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: { combination: { anyOf: [{ anyOf: [] }, text] } },
    };
    expect(removeAndValidate(schema)).toEqual({
      type: 'object',
      properties: { combination: { anyOf: [text] } },
    });
  });

  it('Removes a combination whose only subschemas were empty combinations', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: { text, combination: { oneOf: [{ anyOf: [] }, { allOf: [] }] } },
    };
    expect(removeAndValidate(schema)).toEqual({ type: 'object', properties: { text } });
  });

  it('Removes references to a removed definition', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: { text, choice: { $ref: '#/$defs/Choice' } },
      $defs: { Choice: { anyOf: [] }, Kept: text },
    };
    expect(removeAndValidate(schema)).toEqual({
      type: 'object',
      properties: { text },
      $defs: { Kept: text },
    });
  });

  it('Removes sibling references to the same removed definition', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: {
        text,
        combination: { anyOf: [{ $ref: '#/$defs/Choice' }, { $ref: '#/$defs/Choice' }] },
      },
      $defs: { Choice: { anyOf: [] }, Kept: text },
    };
    expect(removeAndValidate(schema)).toEqual({
      type: 'object',
      properties: { text },
      $defs: { Kept: text },
    });
  });

  it('Returns the given schema itself when it has no combinations without subschemas', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: { text, combination: { anyOf: [text, { type: 'number' }] } },
    };
    expect(removeAndValidate(schema)).toEqual(schema);
    expect(removeEmptyCombinations(schema)).toBe(schema);
  });

  it('Returns the given schema itself when a value only looks like an empty combination', () => {
    // The raw scan cannot tell this `default` value from a combination keyword, so only the node
    // level decides that there is nothing to remove.
    const schema: JsonSchema = {
      type: 'object',
      properties: { text: { type: 'string', default: { anyOf: [] } } },
    };
    expect(hasEmptyCombination(schema)).toBe(true);
    expect(removeEmptyCombinations(schema)).toBe(schema);
  });

  it('Does not mutate the given schema', () => {
    const schema: JsonSchema = { type: 'object', properties: { combination: { anyOf: [] } } };
    const copy = JSON.parse(JSON.stringify(schema));
    removeEmptyCombinations(schema);
    expect(schema).toEqual(copy);
  });
});

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
