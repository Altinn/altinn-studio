import { CombinationKind, FieldType, ObjectKind, UiSchemaNode, UiSchemaNodes } from '../src';

const rootNodePointer = '#';
const parentNodePointer = '#/properties/test';
const stringNodePointer = '#/properties/test/anyOf/stringNode';
const numberNodePointer = '#/properties/test/anyOf/numberNode';
const enumNodePointer = '#/properties/test/anyOf/enumNode';
const arrayNodePointer = '#/properties/test/anyOf/arrayNode';
const optionalNodePointer = '#/properties/test/anyOf/optionalNode';
const requiredNodePointer = '#/properties/test/anyOf/requiredNode';
const defNodePointer = '#/$defs/testDef';
const allOfNodePointer = '#/properties/allOfNode';
const allOfNodeChildPointer = '#/properties/allOfNode/allOf/someNode';

const simpleParentNodePointer = '#/properties/simpleParent';
const simpleChildNodePointer = '#/properties/simpleParent/properties/simpleChild';
const simpleArrayPointer = '#/properties/simpleArray';
const simpleArrayItemsPointer = '#/properties/simpleArray/items/properties/simpleChild';

export const nodeMockBase: UiSchemaNode = {
  objectKind: ObjectKind.Field,
  fieldType: FieldType.String,
  pointer: '#',
  isRequired: false,
  isNillable: false,
  isCombinationItem: false,
  isArray: false,
  children: [],
  custom: {},
  restrictions: [],
  implicitType: true,
  enum: [],
};

export const rootNodeMock: UiSchemaNode = {
  ...nodeMockBase,
  pointer: rootNodePointer,
  objectKind: ObjectKind.Combination,
  fieldType: FieldType.Object,
  children: [
    parentNodePointer,
    defNodePointer,
    allOfNodePointer,
    simpleParentNodePointer,
    simpleArrayPointer,
  ],
  implicitType: false,
};

export const parentNodeMock: UiSchemaNode = {
  ...nodeMockBase,
  objectKind: ObjectKind.Combination,
  fieldType: CombinationKind.AnyOf,
  pointer: parentNodePointer,
  children: [
    stringNodePointer,
    numberNodePointer,
    enumNodePointer,
    arrayNodePointer,
    optionalNodePointer,
    requiredNodePointer,
  ],
};

export const stringNodeMock: UiSchemaNode = {
  ...nodeMockBase,
  pointer: stringNodePointer,
  fieldType: FieldType.String,
  isCombinationItem: true,
};

export const numberNodeMock: UiSchemaNode = {
  ...nodeMockBase,
  pointer: numberNodePointer,
  fieldType: FieldType.Number,
  isCombinationItem: true,
};

export const enumNodeMock: UiSchemaNode = {
  ...nodeMockBase,
  pointer: enumNodePointer,
  fieldType: FieldType.String,
  isCombinationItem: true,
  enum: ['val1', 'val2', 'val3'],
};

export const arrayNodeMock: UiSchemaNode = {
  ...nodeMockBase,
  pointer: arrayNodePointer,
  isArray: true,
};

export const defNodeMock: UiSchemaNode = {
  ...nodeMockBase,
  pointer: defNodePointer,
};

export const optionalNodeMock: UiSchemaNode = {
  ...nodeMockBase,
  pointer: optionalNodePointer,
  isRequired: false,
};

export const requiredNodeMock: UiSchemaNode = {
  ...nodeMockBase,
  pointer: requiredNodePointer,
  isRequired: true,
};

export const allOfNodeMock: UiSchemaNode = {
  ...nodeMockBase,
  pointer: allOfNodePointer,
  objectKind: ObjectKind.Combination,
  fieldType: CombinationKind.AllOf,
  children: [allOfNodeChildPointer],
};

export const allOfNodeChildMock: UiSchemaNode = {
  ...nodeMockBase,
  pointer: allOfNodeChildPointer,
  isCombinationItem: true,
};

export const simpleParentNodeMock: UiSchemaNode = {
  ...nodeMockBase,
  pointer: simpleParentNodePointer,
  fieldType: FieldType.Object,
  children: [simpleChildNodePointer],
};

export const simpleChildNodeMock: UiSchemaNode = {
  ...nodeMockBase,
  pointer: simpleChildNodePointer,
};

export const simpleArrayMock: UiSchemaNode = {
  ...nodeMockBase,
  pointer: simpleArrayPointer,
  fieldType: FieldType.Object,
  isArray: true,
  children: [simpleArrayItemsPointer],
};

export const simpleArrayItemsMock: UiSchemaNode = {
  ...nodeMockBase,
  pointer: simpleArrayItemsPointer,
};

export const uiSchemaMock: UiSchemaNodes = [
  rootNodeMock,
  parentNodeMock,
  stringNodeMock,
  numberNodeMock,
  enumNodeMock,
  arrayNodeMock,
  defNodeMock,
  optionalNodeMock,
  requiredNodeMock,
  allOfNodeMock,
  allOfNodeChildMock,
  simpleParentNodeMock,
  simpleChildNodeMock,
  simpleArrayMock,
  simpleArrayItemsMock,
];
