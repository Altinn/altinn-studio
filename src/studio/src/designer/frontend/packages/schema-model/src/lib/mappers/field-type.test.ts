import type { Dict, UiSchemaNode } from '../types';
import { CombinationKind, FieldType, ObjectKind } from '../types';
import { findEnumFieldType, findJsonFieldType, findUiFieldType } from './field-type';

test.each([
  [{}, undefined],
  [{ properties: {} }, FieldType.Object],
  [{ type: FieldType.Number }, FieldType.Number],
  [{ type: [FieldType.Null, FieldType.String] }, FieldType.String],
  [{ type: [FieldType.String, FieldType.Null] }, FieldType.String],
  [{ anyOf: [] }, CombinationKind.AnyOf],
  [{ oneOf: [] }, CombinationKind.OneOf],
  [{ allOf: [] }, CombinationKind.AllOf],
  [{ $ref: '' }, undefined],
  [{ $ref: '', type: FieldType.Object }, FieldType.Object],
  [{ anyOf: [], type: FieldType.String }, FieldType.String],
  [{ oneOf: [], type: FieldType.String }, FieldType.String],
  [{ allOf: [], type: FieldType.String }, FieldType.String],
  [{ pattern: '' }, FieldType.String],
  [{ enum: ['h'] }, FieldType.String],
])('correct ui type for %p', (schemaNode: Dict, expected) => {
  expect(findUiFieldType(schemaNode)).toBe(expected);
});

test.each([
  [
    [1, 2],
    FieldType.Number,
    ['s', 'f'],
    FieldType.String,
    [1, 'f'],
    undefined,
    [{}, {}],
    FieldType.Object,
  ],
])('correct enum type for %p', (nodeEnum: any[], expected) =>
  expect(findEnumFieldType(nodeEnum)).toBe(expected)
);

test.each([
  [{}, undefined],
  [
    { objectKind: ObjectKind.Field, fieldType: FieldType.String, isNillable: true },
    [FieldType.String, FieldType.Null],
  ],
  [{ objectKind: ObjectKind.Field, fieldType: FieldType.Null, isNillable: true }, FieldType.Null],
])('correct json type for %p', (uiNode: Partial<UiSchemaNode>, expected) => {
  expect(findJsonFieldType(uiNode as UiSchemaNode)).toStrictEqual(expected);
});
