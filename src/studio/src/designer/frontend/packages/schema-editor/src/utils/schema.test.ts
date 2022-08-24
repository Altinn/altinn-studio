import type { UiSchemaItem } from '../types';
import {
  buildJsonSchema,
  buildUISchema,
  getUiSchemaItem,
  getUiSchemaItemsByRef,
  getUiSchemaTreeFromItem,
} from './schema';

const mockUiSchema: UiSchemaItem[] = [
  {
    path: '#/properties/id1',
    displayName: 'id1',
    $ref: '#/$defs/id3',
  },
  {
    path: '#/properties/id2',
    displayName: 'id2',
    properties: [
      {
        path: '#/properties/id2/properties/id3',
        displayName: 'id3',
        $ref: '#/$defs/id3',
        isRequired: true,
      },
    ],
    required: ['id3'],
  },
  {
    path: '#/properties/allOfTest',
    displayName: 'allOfTest',
    combination: [
      {
        path: '#/properties/allOfTest/allOf/0',
        $ref: '#/$defs/refTest',
        displayName: 'ref',
        combinationItem: true,
      } as UiSchemaItem,
    ],
    combinationKind: 'allOf',
    restrictions: [],
  },
  {
    path: '#/properties/oneOfTest',
    displayName: 'oneOfTest',
    combination: [
      {
        path: '#/properties/oneOfTest/oneOf/0',
        $ref: '#/$defs/refTest',
        displayName: 'ref',
        combinationItem: true,
      } as UiSchemaItem,
    ],
    combinationKind: 'oneOf',
    restrictions: [],
  },
  {
    path: '#/properties/anyOfTest',
    displayName: 'anyOfTest',
    combination: [
      {
        path: '#/properties/anyOfTest/anyOf/0',
        $ref: '#/$defs/refTest',
        displayName: 'ref',
        combinationItem: true,
      } as UiSchemaItem,
    ],
    combinationKind: 'anyOf',
    restrictions: [],
  },
  {
    type: 'string',
    path: '#/$defs/refTest',
    displayName: 'refTest',
    restrictions: [{ key: 'minLength', value: 2 }],
  },
  {
    path: '#/$defs/id3',
    displayName: 'id3',
    type: 'string',
    restrictions: [{ key: 'maxLength', value: 10 }],
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
      required: ['id3'],
    },
    allOfTest: {
      allOf: [{ $ref: '#/$defs/refTest' }],
    },
    oneOfTest: {
      oneOf: [{ $ref: '#/$defs/refTest' }],
    },
    anyOfTest: {
      anyOf: [{ $ref: '#/$defs/refTest' }],
    },
  },
  $defs: {
    refTest: {
      type: 'string',
      minLength: 2,
    },
    id3: {
      type: 'string',
      maxLength: 10,
    },
  },
};
test('gets referenced items', () => {
  const result = getUiSchemaItemsByRef(mockUiSchema, '#/$defs/id3');
  expect(result).toHaveLength(2);
});
test('gets UI schema item', () => {
  const result = getUiSchemaItem(mockUiSchema, '#/$defs/id3');
  expect(result).toEqual({
    path: '#/$defs/id3',
    displayName: 'id3',
    type: 'string',
    restrictions: [{ key: 'maxLength', value: 10 }],
  });
});

test('gets UI schema item from allOf/anyOf/oneOf ', () => {
  const allOfItem = getUiSchemaItem(
    mockUiSchema,
    '#/properties/allOfTest/allOf/0',
  );
  const anyOfItem = getUiSchemaItem(
    mockUiSchema,
    '#/properties/anyOfTest/anyOf/0',
  );
  const oneOfItem = getUiSchemaItem(
    mockUiSchema,
    '#/properties/oneOfTest/oneOf/0',
  );

  expect(allOfItem).toEqual({
    path: '#/properties/allOfTest/allOf/0',
    $ref: '#/$defs/refTest',
    displayName: 'ref',
    combinationItem: true,
  });
  expect(anyOfItem).toEqual({
    path: '#/properties/anyOfTest/anyOf/0',
    $ref: '#/$defs/refTest',
    displayName: 'ref',
    combinationItem: true,
  });
  expect(oneOfItem).toEqual({
    path: '#/properties/oneOfTest/oneOf/0',
    $ref: '#/$defs/refTest',
    displayName: 'ref',
    combinationItem: true,
  });
});

test('build json schema', () => {
  const result = buildJsonSchema(mockUiSchema);
  expect(result).toEqual(mockJsonSchema);
});

test('build UI schema', () => {
  const result = buildUISchema(
    mockJsonSchema.properties,
    '#/properties',
  ).concat(buildUISchema(mockJsonSchema.$defs, '#/$defs'));
  expect(result).toEqual(mockUiSchema);
});

test('that we get uiSchemaTree from item ', () => {
  const testSchema = getUiSchemaItem(mockUiSchema, '#/properties/id2');
  const tree = getUiSchemaTreeFromItem(mockUiSchema, testSchema);
  expect(tree).toHaveLength(2);
});
