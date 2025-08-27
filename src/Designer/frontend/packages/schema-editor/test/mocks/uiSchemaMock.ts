import type {
  CombinationNode,
  FieldNode,
  ReferenceNode,
  UiSchemaNodes,
} from '@altinn/schema-model';
import { CombinationKind, FieldType, ObjectKind, ROOT_POINTER } from '@altinn/schema-model';

const combinationNodePointer = '#/properties/test';
const fieldNode1Pointer = '#/properties/test/anyOf/0';
const fieldNode2Pointer = '#/properties/test/anyOf/1';
const nodeWithCustomPropsPointer = '#/properties/test2';
const toggableNodePointer = '#/properties/toggable';
const objectNodePointer = '#/properties/parent2';
const objectChildPointer = '#/properties/parent2/properties/someNode';
const definitionNodePointer = '#/$defs/def1';
const childOfDefinitionNodePointer = '#/$defs/def1/properties/childOfDef1';
const stringDefinitionNodePointer = '#/$defs/def2';
const nodeWithSameNameAsObjectChildPointer = '#/properties/someNode';
const referenceNodePointer = '#/properties/referenceNode';
const referredNodePointer = '#/$defs/referredNode';
const childOfReferredNodePointer = '#/$defs/referredNode/properties/childOfReferredNode';

export const nodeMockBase: FieldNode = {
  objectKind: ObjectKind.Field,
  fieldType: FieldType.String,
  schemaPointer: '#',
  isRequired: false,
  isNillable: false,
  isArray: false,
  children: [],
  custom: {},
  restrictions: {},
  implicitType: true,
  enum: [],
};

export const referenceNodeMock: ReferenceNode = {
  ...nodeMockBase,
  objectKind: ObjectKind.Reference,
  schemaPointer: referenceNodePointer,
  reference: referredNodePointer,
};

export const referredNodeMock: FieldNode = {
  ...nodeMockBase,
  fieldType: FieldType.Object,
  schemaPointer: referredNodePointer,
  children: [childOfReferredNodePointer],
};

export const childOfReferredNodeMock: FieldNode = {
  ...nodeMockBase,
  schemaPointer: childOfReferredNodePointer,
};

export const rootNodeMock: FieldNode = {
  ...nodeMockBase,
  fieldType: FieldType.Object,
  schemaPointer: ROOT_POINTER,
  children: [
    combinationNodePointer,
    toggableNodePointer,
    nodeWithCustomPropsPointer,
    objectNodePointer,
    definitionNodePointer,
    stringDefinitionNodePointer,
    nodeWithSameNameAsObjectChildPointer,
    referenceNodePointer,
    referredNodePointer,
  ],
};

export const combinationNodeMock: CombinationNode = {
  ...nodeMockBase,
  objectKind: ObjectKind.Combination,
  combinationType: CombinationKind.AnyOf,
  schemaPointer: combinationNodePointer,
  children: [fieldNode1Pointer, fieldNode2Pointer],
};

export const fieldNode1Mock: FieldNode = {
  ...nodeMockBase,
  schemaPointer: fieldNode1Pointer,
};

export const fieldNode2Mock: FieldNode = {
  ...nodeMockBase,
  schemaPointer: fieldNode2Pointer,
};

export const toggableNodeMock: FieldNode = {
  ...nodeMockBase,
  schemaPointer: toggableNodePointer,
};

export const nodeWithCustomPropsMock: FieldNode = {
  ...nodeMockBase,
  schemaPointer: nodeWithCustomPropsPointer,
  custom: {
    customProp1: 'customProp1',
    customProp2: 'customProp2',
  },
};

export const objectNodeMock: FieldNode = {
  ...nodeMockBase,
  schemaPointer: objectNodePointer,
  fieldType: FieldType.Object,
  children: [objectChildPointer],
};

export const objectChildMock: FieldNode = {
  ...nodeMockBase,
  schemaPointer: objectChildPointer,
};

export const definitionNodeMock: FieldNode = {
  ...nodeMockBase,
  schemaPointer: definitionNodePointer,
  fieldType: FieldType.Object,
  children: [childOfDefinitionNodePointer],
};

export const childOfDefinitionNodeMock: FieldNode = {
  ...nodeMockBase,
  schemaPointer: childOfDefinitionNodePointer,
};

export const stringDefinitionNodeMock: FieldNode = {
  ...nodeMockBase,
  schemaPointer: stringDefinitionNodePointer,
  fieldType: FieldType.String,
};

export const nodeWithSameNameAsObjectChildMock: FieldNode = {
  ...nodeMockBase,
  schemaPointer: nodeWithSameNameAsObjectChildPointer,
};

export const uiSchemaNodesMock: UiSchemaNodes = [
  rootNodeMock,
  combinationNodeMock,
  fieldNode1Mock,
  fieldNode2Mock,
  referenceNodeMock,
  referredNodeMock,
  childOfReferredNodeMock,
  nodeWithCustomPropsMock,
  toggableNodeMock,
  objectNodeMock,
  objectChildMock,
  definitionNodeMock,
  childOfDefinitionNodeMock,
  stringDefinitionNodeMock,
  nodeWithSameNameAsObjectChildMock,
];
