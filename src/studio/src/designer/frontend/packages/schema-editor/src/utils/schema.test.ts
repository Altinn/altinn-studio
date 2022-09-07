import type { UiSchemaItem } from '../types';
import { CombinationKind, FieldType } from '../types';
import {
  buildJsonSchema,
  buildUISchema,
  getUiSchemaItem,
  getUiSchemaItemsByRef,
  getUiSchemaTreeFromItem,
} from './schema';
import Ajv2020 from 'ajv/dist/2020';

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
    type: FieldType.Object,
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
    combinationKind: CombinationKind.AllOf,
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
    combinationKind: CombinationKind.OneOf,
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
    combinationKind: CombinationKind.AnyOf,
    restrictions: [],
  },
  {
    type: FieldType.String,
    path: '#/$defs/refTest',
    displayName: 'refTest',
    restrictions: [{ key: 'minLength', value: 2 }],
  },
  {
    path: '#/$defs/id3',
    displayName: 'id3',
    type: FieldType.String,
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
      type: FieldType.Object,
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
      type: FieldType.String,
      minLength: 2,
    },
    id3: {
      type: FieldType.String,
      maxLength: 10,
    },
  },
};
test('json schema should validate', () => {
  const result = new Ajv2020().validateSchema(mockJsonSchema);
  expect(result).toBeTruthy();
});
test('gets referenced items', () => {
  const result = getUiSchemaItemsByRef(mockUiSchema, '#/$defs/id3');
  expect(result).toHaveLength(2);
});
test('gets UI schema item', () => {
  const result = getUiSchemaItem(mockUiSchema, '#/$defs/id3');
  expect(result).toEqual({
    path: '#/$defs/id3',
    displayName: 'id3',
    type: FieldType.String,
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
  const uiSchema: UiSchemaItem[] = [
    {
      path: '#/$schema',
      value: 'https://json-schema.org/draft/2020-12/schema',
      displayName: 'schema',
    } as UiSchemaItem,
  ].concat(mockUiSchema);
  const result = buildJsonSchema(uiSchema);
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
