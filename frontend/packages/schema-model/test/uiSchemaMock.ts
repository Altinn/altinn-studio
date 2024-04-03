import type {
  CombinationNode,
  FieldNode,
  ReferenceNode,
  UiSchemaNode,
  UiSchemaNodes,
} from '../src';
import { CombinationKind, FieldType, ObjectKind } from '../src';
import { defaultReferenceNode } from '../src/config/default-nodes';

const rootNodePointer = '#';
const parentNodePointer = '#/properties/test';
const stringNodePointer = '#/properties/test/properties/stringNode';
const numberNodePointer = '#/properties/test/properties/numberNode';
const enumNodePointer = '#/properties/test/properties/enumNode';
const arrayNodePointer = '#/properties/test/properties/arrayNode';
const optionalNodePointer = '#/properties/test/properties/optionalNode';
const requiredNodePointer = '#/properties/test/properties/requiredNode';
const defNodePointer = '#/$defs/testDef';
const allOfNodePointer = '#/properties/allOfNode';
const allOfNodeChildPointer = '#/properties/allOfNode/allOf/0';
const referenceNodePointer = '#/properties/test/properties/referenceNode';
const subParentNodePointer = '#/properties/test/properties/subParent';
const subSubNodePointer = '#/properties/test/properties/subParent/properties/subSubNode';
const nodeWithSameNameAsStringNodePointer = '#/properties/stringNode';

const simpleParentNodePointer = '#/properties/simpleParent';
const simpleChildNodePointer = '#/properties/simpleParent/properties/simpleChild';
const simpleArrayPointer = '#/properties/simpleArray';
const simpleArrayItemsPointer = '#/properties/simpleArray/items/properties/simpleChild';

const defNodeWithChildrenPointer = '#/$defs/parentDef';
const defNodeWithChildrenChildPointer = '#/$defs/parentDef/properties/child';
const defNodeWithChildrenGrandchildPointer =
  '#/$defs/parentDef/properties/child/properties/grandchild';
const referenceToObjectNodePointer = '#/properties/referenceToParent';

const unusedDefinitionPointer = '#/$defs/unusedDef';
const unusedDefinitionWithSameNameAsExistingObjectPointer = '#/$defs/test';
const referenceDefinitionPointer = '#/$defs/referenceDef';

const combinationNodeWithMultipleChildrenPointer =
  '#/properties/combinationNodeWithMultipleChildren';
const combinationNodeChild1Pointer = '#/properties/combinationNodeWithMultipleChildren/anyOf/0';
const combinationNodeChild2Pointer = '#/properties/combinationNodeWithMultipleChildren/anyOf/1';
const combinationNodeChild3Pointer = '#/properties/combinationNodeWithMultipleChildren/anyOf/2';

export const nodeMockBase: UiSchemaNode = {
  objectKind: ObjectKind.Field,
  fieldType: FieldType.String,
  pointer: '#',
  isRequired: false,
  isNillable: false,
  isArray: false,
  children: [],
  custom: {},
  restrictions: [],
  implicitType: true,
  enum: [],
};

export const rootNodeMock: FieldNode = {
  ...nodeMockBase,
  pointer: rootNodePointer,
  objectKind: ObjectKind.Field,
  fieldType: FieldType.Object,
  children: [
    parentNodePointer,
    defNodePointer,
    allOfNodePointer,
    simpleParentNodePointer,
    simpleArrayPointer,
    defNodeWithChildrenPointer,
    referenceToObjectNodePointer,
    unusedDefinitionPointer,
    unusedDefinitionWithSameNameAsExistingObjectPointer,
    referenceDefinitionPointer,
    nodeWithSameNameAsStringNodePointer,
    combinationNodeWithMultipleChildrenPointer,
  ],
};

export const parentNodeMock: FieldNode = {
  ...nodeMockBase,
  objectKind: ObjectKind.Field,
  fieldType: FieldType.Object,
  pointer: parentNodePointer,
  children: [
    stringNodePointer,
    numberNodePointer,
    enumNodePointer,
    arrayNodePointer,
    optionalNodePointer,
    requiredNodePointer,
    referenceNodePointer,
    subParentNodePointer,
  ],
};

export const stringNodeMock: FieldNode = {
  ...nodeMockBase,
  pointer: stringNodePointer,
  fieldType: FieldType.String,
};

export const numberNodeMock: UiSchemaNode = {
  ...nodeMockBase,
  pointer: numberNodePointer,
  fieldType: FieldType.Number,
};

export const enumNodeMock: FieldNode = {
  ...nodeMockBase,
  pointer: enumNodePointer,
  fieldType: FieldType.String,
  enum: ['val1', 'val2', 'val3'],
};

export const arrayNodeMock: FieldNode = {
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

export const referenceNodeMock: ReferenceNode = {
  ...nodeMockBase,
  pointer: referenceNodePointer,
  objectKind: ObjectKind.Reference,
  reference: defNodePointer,
};

export const subParentNodeMock: UiSchemaNode = {
  ...nodeMockBase,
  pointer: subParentNodePointer,
  fieldType: FieldType.Object,
  children: [subSubNodePointer],
};

export const subSubNodeMock: UiSchemaNode = {
  ...nodeMockBase,
  pointer: subSubNodePointer,
  fieldType: FieldType.String,
};

export const allOfNodeMock: CombinationNode = {
  ...nodeMockBase,
  pointer: allOfNodePointer,
  objectKind: ObjectKind.Combination,
  combinationType: CombinationKind.AllOf,
  children: [allOfNodeChildPointer],
};

export const allOfNodeChildMock: UiSchemaNode = {
  ...nodeMockBase,
  pointer: allOfNodeChildPointer,
};

export const simpleParentNodeMock: FieldNode = {
  ...nodeMockBase,
  pointer: simpleParentNodePointer,
  fieldType: FieldType.Object,
  children: [simpleChildNodePointer],
};

export const simpleChildNodeMock: UiSchemaNode = {
  ...nodeMockBase,
  pointer: simpleChildNodePointer,
};

export const simpleArrayMock: FieldNode = {
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

export const defNodeWithChildrenMock: FieldNode = {
  ...nodeMockBase,
  pointer: defNodeWithChildrenPointer,
  fieldType: FieldType.Object,
  children: [defNodeWithChildrenChildPointer],
};

export const defNodeWithChildrenChildMock: FieldNode = {
  ...nodeMockBase,
  pointer: defNodeWithChildrenChildPointer,
  fieldType: FieldType.Object,
  children: [defNodeWithChildrenGrandchildPointer],
};

export const defNodeWithChildrenGrandchildMock: FieldNode = {
  ...nodeMockBase,
  pointer: defNodeWithChildrenGrandchildPointer,
};

export const referenceToObjectNodeMock: ReferenceNode = {
  ...defaultReferenceNode,
  pointer: referenceToObjectNodePointer,
  reference: defNodeWithChildrenPointer,
};

export const unusedDefinitionMock: UiSchemaNode = {
  ...nodeMockBase,
  pointer: unusedDefinitionPointer,
};

export const unusedDefinitionWithSameNameAsExistingObjectMock: UiSchemaNode = {
  ...nodeMockBase,
  pointer: unusedDefinitionWithSameNameAsExistingObjectPointer,
};

export const referenceDefinitionMock: ReferenceNode = {
  ...defaultReferenceNode,
  pointer: referenceDefinitionPointer,
  reference: defNodePointer,
};

export const nodeWithSameNameAsStringNodeMock: FieldNode = {
  ...nodeMockBase,
  pointer: nodeWithSameNameAsStringNodePointer,
  fieldType: FieldType.String,
};

export const combinationNodeWithMultipleChildrenMock: CombinationNode = {
  ...nodeMockBase,
  pointer: combinationNodeWithMultipleChildrenPointer,
  objectKind: ObjectKind.Combination,
  combinationType: CombinationKind.AnyOf,
  children: [
    combinationNodeChild1Pointer,
    combinationNodeChild2Pointer,
    combinationNodeChild3Pointer,
  ],
};

export const combinationNodeChild1Mock: FieldNode = {
  ...nodeMockBase,
  pointer: combinationNodeChild1Pointer,
  title: 'Child 1',
};

export const combinationNodeChild2Mock: FieldNode = {
  ...nodeMockBase,
  pointer: combinationNodeChild2Pointer,
  title: 'Child 2',
};

export const combinationNodeChild3Mock: FieldNode = {
  ...nodeMockBase,
  pointer: combinationNodeChild3Pointer,
  title: 'Child 3',
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
  referenceNodeMock,
  subParentNodeMock,
  subSubNodeMock,
  defNodeWithChildrenMock,
  defNodeWithChildrenChildMock,
  defNodeWithChildrenGrandchildMock,
  referenceToObjectNodeMock,
  unusedDefinitionMock,
  unusedDefinitionWithSameNameAsExistingObjectMock,
  referenceDefinitionMock,
  nodeWithSameNameAsStringNodeMock,
  combinationNodeWithMultipleChildrenMock,
  combinationNodeChild1Mock,
  combinationNodeChild2Mock,
  combinationNodeChild3Mock,
];
