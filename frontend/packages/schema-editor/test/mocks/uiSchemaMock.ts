import {
  CombinationKind,
  CombinationNode,
  FieldNode,
  FieldType,
  ObjectKind,
  ROOT_POINTER,
  UiSchemaNodes,
} from '@altinn/schema-model';

const combinationNodePointer = '#/properties/test';
const fieldNode1Pointer = '#/properties/test/anyOf/0';
const fieldNode2Pointer = '#/properties/test/anyOf/1';
const nodeWithCustomPropsPointer = '#/properties/test2';
const toggableNodePointer = '#/properties/toggable';
const objectNodePointer = '#/properties/parent2';
const objectChildPointer = '#/properties/parent2/properties/someNode';
const definitionNodePointer = '#/$defs/def1';
const childOfDefinitionNodePointer = '#/$defs/def1/properties/childOfDef1';
const nodeWithSameNameAsObjectChildPointer = '#/properties/someNode';

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
  children: [
    combinationNodePointer,
    toggableNodePointer,
    nodeWithCustomPropsPointer,
    objectNodePointer,
    definitionNodePointer,
    nodeWithSameNameAsObjectChildPointer,
  ],
};

export const combinationNodeMock: CombinationNode = {
  ...nodeMockBase,
  objectKind: ObjectKind.Combination,
  combinationType: CombinationKind.AnyOf,
  pointer: combinationNodePointer,
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

export const objectNodeMock: FieldNode = {
  ...nodeMockBase,
  pointer: objectNodePointer,
  fieldType: FieldType.Object,
  children: [objectChildPointer],
};

export const objectChildMock: FieldNode = {
  ...nodeMockBase,
  pointer: objectChildPointer,
};

export const definitionNodeMock: FieldNode = {
  ...nodeMockBase,
  pointer: definitionNodePointer,
  fieldType: FieldType.Object,
  children: [childOfDefinitionNodePointer],
};

export const childOfDefinitionNodeMock: FieldNode = {
  ...nodeMockBase,
  pointer: childOfDefinitionNodePointer,
};

export const nodeWithSameNameAsObjectChildMock: FieldNode = {
  ...nodeMockBase,
  pointer: nodeWithSameNameAsObjectChildPointer,
};

export const uiSchemaNodesMock: UiSchemaNodes = [
  rootNodeMock,
  combinationNodeMock,
  fieldNode1Mock,
  fieldNode2Mock,
  nodeWithCustomPropsMock,
  toggableNodeMock,
  objectNodeMock,
  objectChildMock,
  definitionNodeMock,
  childOfDefinitionNodeMock,
  nodeWithSameNameAsObjectChildMock,
];
