import { UiSchemaItem } from '../../src/types';
import { buildJsonSchema, buildUISchema, getUiSchemaItem } from '../../src/utils';

const mockUiSchema: UiSchemaItem[] = [
  {
    path: '#/properties/id1', displayName: 'id1', $ref: '#/$defs/id3',
  },
  {
    path: '#/properties/id2',
    displayName: 'id2',
    properties: [
      {
        path: '#/properties/id2/properties/id3', displayName: 'id3', $ref: '#/$defs/id3',
      },
    ],
  },
  {
    path: '#/properties/allOfTest',
    displayName: 'allOfTest',
    allOf: [ { $ref: '#/$defs/refTest' } as UiSchemaItem],
    restrictions: [],
  },
  {
    path: '#/properties/oneOfTest',
    displayName: 'oneOfTest',
    oneOf: [ { $ref: '#/$defs/refTest' } as UiSchemaItem],
    restrictions: [],
  },
  {
    path: '#/properties/anyOfTest',
    displayName: 'anyOfTest',
    anyOf: [ { $ref: '#/$defs/refTest' } as UiSchemaItem],
    restrictions: [],
  },
  {
    type: 'string',
    path: '#/$defs/refTest',
    displayName: 'refTest',
    restrictions: [
      { key: 'minLength', value: 2 },
    ],
  },
  {
    path: '#/$defs/id3',
    displayName: 'id3',
    type: 'string',
    restrictions: [
      { key: 'maxLength', value: 10 },
    ],
  },
];

const mockJsonSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  properties: {
    id1: {
      $ref: '#/$defs/id3',
    },
    id2: {
      properties: {
        id3: {
          $ref: '#/$defs/id3',
        },
      },
    },
    allOfTest: {
      allOf: [ { $ref: '#/$defs/refTest' }],
    },
    oneOfTest: {
      oneOf: [ { $ref: '#/$defs/refTest' }],
    },
    anyOfTest: {
      anyOf: [ { $ref: '#/$defs/refTest' }],
    },
  },
  $defs: {
    refTest: {
      type: 'string',
      minLength: 2
    },
    id3: {
      type: 'string',
      maxLength: 10,
    },
  },
};

test('gets UI schema item', () => {
  const result = getUiSchemaItem(mockUiSchema, '#/$defs/id3');
  expect(result).toEqual({
    path: '#/$defs/id3',
    displayName: 'id3',
    type: 'string',
    restrictions: [
      { key: 'maxLength', value: 10 },
    ],
  });
});

test('build json schema', () => {
  const result = buildJsonSchema(mockUiSchema);
  expect(result).toEqual(mockJsonSchema);
});

test('build UI schema', () => {
  const result = buildUISchema(mockJsonSchema.properties, '#/properties').concat(buildUISchema(mockJsonSchema.$defs, '#/$defs'));
  expect(result).toEqual(mockUiSchema);
});
