import { getJsonFieldType, getUiFieldType } from './field-type';
import { CombinationKind, FieldType, JsonSchemaNode, ObjectKind, UiSchemaNode } from '../types';

test.each([
  [{}, undefined],
  [{ properties: {} }, FieldType.Object],
  [{ type: FieldType.Number }, FieldType.Number],
  [{ type: FieldType.Array }, FieldType.Array],
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
])('correct ui type for %p', (schemaNode: JsonSchemaNode, expected) => {
  expect(getUiFieldType(schemaNode)).toBe(expected);
});

test.each([
  [
    [1, 2],
    FieldType.Integer,
    ['s', 'f'],
    FieldType.String,
    [1, 'f'],
    undefined,
    [{}, {}],
    FieldType.Object,
  ],
])('correct enum type for %p', (nodeEnum: any[], expected) => {});

test.each([
  [{}, undefined],
  [{ objectKind: ObjectKind.Array }, FieldType.Array],
  [{ objectKind: ObjectKind.Array, implicitType: true }, undefined],
  [
    { objectKind: ObjectKind.Field, fieldType: FieldType.String, isNillable: true },
    [FieldType.String, FieldType.Null],
  ],
  [{ objectKind: ObjectKind.Field, fieldType: FieldType.Null, isNillable: true }, FieldType.Null],
])('correct json type for %p', (uiNode: Partial<UiSchemaNode>, expected) => {
  expect(getJsonFieldType(uiNode as UiSchemaNode)).toStrictEqual(expected);
});
