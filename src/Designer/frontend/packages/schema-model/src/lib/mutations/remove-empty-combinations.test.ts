import { removeEmptyCombinations } from './remove-empty-combinations';
import { buildUiSchema } from '../build-ui-schema';
import { buildJsonSchema } from '../build-json-schema';
import type { JsonSchema } from 'app-shared/types/JsonSchema';
import { validateTestUiSchema } from '../../../test/validateTestUiSchema';

const roundTrip = (schema: JsonSchema): JsonSchema => {
  const nodes = removeEmptyCombinations(buildUiSchema(schema));
  validateTestUiSchema(nodes);
  return JSON.parse(JSON.stringify(buildJsonSchema(nodes)));
};

describe('removeEmptyCombinations', () => {
  const text = { type: 'string' };

  it('Removes a combination without subschemas', () => {
    const schema: JsonSchema = { type: 'object', properties: { text, combination: { anyOf: [] } } };
    expect(roundTrip(schema)).toEqual({ type: 'object', properties: { text } });
  });

  it('Removes the combination from the required list of its parent', () => {
    const schema: JsonSchema = {
      type: 'object',
      required: ['text', 'combination'],
      properties: { text, combination: { anyOf: [] } },
    };
    expect(roundTrip(schema)).toEqual({ type: 'object', required: ['text'], properties: { text } });
  });

  it('Renumbers the remaining subschemas when a nested combination is removed', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: { combination: { anyOf: [{ anyOf: [] }, text] } },
    };
    expect(roundTrip(schema)).toEqual({
      type: 'object',
      properties: { combination: { anyOf: [text] } },
    });
  });

  it('Removes a combination whose only subschemas were empty combinations', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: { text, combination: { oneOf: [{ anyOf: [] }, { allOf: [] }] } },
    };
    expect(roundTrip(schema)).toEqual({ type: 'object', properties: { text } });
  });

  it('Removes references to a removed definition', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: { text, choice: { $ref: '#/$defs/Choice' } },
      $defs: { Choice: { anyOf: [] }, Kept: text },
    };
    expect(roundTrip(schema)).toEqual({
      type: 'object',
      properties: { text },
      $defs: { Kept: text },
    });
  });

  it('Leaves a schema without empty combinations unchanged', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: { text, combination: { anyOf: [text, { type: 'number' }] } },
    };
    expect(roundTrip(schema)).toEqual(schema);
  });

  it('Does not mutate the given nodes', () => {
    const nodes = buildUiSchema({ type: 'object', properties: { combination: { anyOf: [] } } });
    const copy = JSON.parse(JSON.stringify(nodes));
    removeEmptyCombinations(nodes);
    expect(nodes).toEqual(copy);
  });
});
