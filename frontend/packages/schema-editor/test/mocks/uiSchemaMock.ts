import {
  CombinationKind,
  CombinationNode,
  FieldNode,
  FieldType,
  ObjectKind,
  ROOT_POINTER,
  UiSchemaNodes,
} from '@altinn/schema-model';

const parentNodePointer = '#/properties/test';
const fieldNode1Pointer = '#/properties/test/anyOf/0';
const fieldNode2Pointer = '#/properties/test/anyOf/1';
const nodeWithCustomPropsPointer = '#/properties/test2';
const toggableNodePointer = '#/properties/toggable';

export const nodeMockBase: FieldNode = {
  objectKind: ObjectKind.Field,
  fieldType: FieldType.String,
  pointer: '#',
  isRequired: false,
  isNillable: false,
  isArray: false,
  children: [],
  custom: {},
  restrictions: {},
  implicitType: true,
  enum: [],
};

export const rootNodeMock: FieldNode = {
  ...nodeMockBase,
  fieldType: FieldType.Object,
  pointer: ROOT_POINTER,
  children: [parentNodePointer, toggableNodePointer, nodeWithCustomPropsPointer],
};

export const parentNodeMock: CombinationNode = {
  ...nodeMockBase,
  objectKind: ObjectKind.Combination,
  combinationType: CombinationKind.AnyOf,
  pointer: parentNodePointer,
  children: [fieldNode1Pointer, fieldNode2Pointer],
};

export const fieldNode1Mock: FieldNode = {
  ...nodeMockBase,
  pointer: fieldNode1Pointer,
};

export const fieldNode2Mock: FieldNode = {
  ...nodeMockBase,
  pointer: fieldNode2Pointer,
};

export const toggableNodeMock: FieldNode = {
  ...nodeMockBase,
  pointer: toggableNodePointer,
};

export const nodeWithCustomPropsMock: FieldNode = {
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
