import {
  CombinationKind,
  FieldType,
  ObjectKind,
  ROOT_POINTER,
  UiSchemaNode,
  UiSchemaNodes,
} from '@altinn/schema-model';

const parentNodePointer = '#/properties/test';
const fieldNode1Pointer = '#/properties/test/anyOf/0';
const fieldNode2Pointer = '#/properties/test/anyOf/1';
const nodeWithCustomPropsPointer = '#/properties/test2';
const toggableNodePointer = '#/properties/toggable';

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
  restrictions: {},
  implicitType: true,
  enum: [],
};

export const rootNodeMock: UiSchemaNode = {
  ...nodeMockBase,
  pointer: ROOT_POINTER,
  children: [parentNodePointer, toggableNodePointer, nodeWithCustomPropsPointer],
};

export const parentNodeMock: UiSchemaNode = {
  ...nodeMockBase,
  objectKind: ObjectKind.Combination,
  fieldType: CombinationKind.AnyOf,
  pointer: parentNodePointer,
  children: [fieldNode1Pointer, fieldNode2Pointer],
};

export const fieldNode1Mock: UiSchemaNode = {
  ...nodeMockBase,
  pointer: fieldNode1Pointer,
  isCombinationItem: true,
};

export const fieldNode2Mock: UiSchemaNode = {
  ...nodeMockBase,
  pointer: fieldNode2Pointer,
  isCombinationItem: true,
};

export const toggableNodeMock: UiSchemaNode = {
  ...nodeMockBase,
  pointer: toggableNodePointer,
};

export const nodeWithCustomPropsMock: UiSchemaNode = {
  ...nodeMockBase,
  pointer: nodeWithCustomPropsPointer,
  custom: {
    customProp1: 'customProp1',
    customProp2: 'customProp2',
  },
};

export const uiSchemaNodesMock: UiSchemaNodes = [
  rootNodeMock,
  parentNodeMock,
  fieldNode1Mock,
  fieldNode2Mock,
  nodeWithCustomPropsMock,
  toggableNodeMock,
];
