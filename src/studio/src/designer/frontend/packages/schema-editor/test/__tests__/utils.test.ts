import { UiSchemaItem } from '../../src/types';
import { buildJsonSchema, buildUISchema, getUiSchemaItem } from '../../src/utils';

const mockUiSchema: UiSchemaItem[] = [
  {
    id: '#/id1', displayName: 'id1', $ref: '#/id2',
  },
  {
    id: '#/id2',
    displayName: 'id2',
    properties: [
      {
        id: '#/id2/properties/id3', displayName: 'id3', $ref: '#/id3',
      },
    ],
  },
  {
    id: '#/id3',
    displayName: 'id3',
    type: 'string',
    restrictions: [
      { key: 'maxLength', value: 10 },
    ],
  },
];

const mockJsonSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  id1: {
    $ref: '#/id2',
  },
  id2: {
    properties: {
      id3: {
        $ref: '#/id3',
      },
    },
  },
  id3: {
    type: 'string',
    maxLength: 10,
  },
};

test('gets UI schema item', () => {
  const result = getUiSchemaItem(mockUiSchema, '#/id3');
  expect(result).toEqual({
    id: '#/id3',
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
  const result = buildUISchema(mockJsonSchema, '#');
  expect(result).toEqual(mockUiSchema);
});
