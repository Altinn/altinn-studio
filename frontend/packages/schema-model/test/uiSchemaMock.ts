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
  '#/$defs/parentDef/properties/child/items/properties/grandchild';
const referenceToObjectNodePointer = '#/properties/referenceToParent';

const unusedDefinitionPointer = '#/$defs/unusedDef';
const unusedDefinitionWithSameNameAsExistingObjectPointer = '#/$defs/test';
const referenceDefinitionPointer = '#/$defs/referenceDef';

const combinationNodeWithMultipleChildrenPointer =
  '#/properties/combinationNodeWithMultipleChildren';
const combinationNodeChild1Pointer = '#/properties/combinationNodeWithMultipleChildren/anyOf/0';
const combinationNodeChild2Pointer = '#/properties/combinationNodeWithMultipleChildren/anyOf/1';
const combinationNodeChild3Pointer = '#/properties/combinationNodeWithMultipleChildren/anyOf/2';

const combinationDefNodePointer = '#/$defs/combinationDef';
const combinationDefNodeChild1Pointer = '#/$defs/combinationDef/oneOf/0';
const combinationDefNodeChild2Pointer = '#/$defs/combinationDef/oneOf/1';
const referenceToCombinationDefNodePointer = '#/properties/referenceToCombinationDef';

export const nodeMockBase: UiSchemaNode = {
  objectKind: ObjectKind.Field,
  fieldType: FieldType.String,
  schemaPointer: '#',
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
  schemaPointer: rootNodePointer,
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
    referenceToCombinationDefNodePointer,
    combinationDefNodePointer,
  ],
};

export const parentNodeMock: FieldNode = {
  ...nodeMockBase,
  objectKind: ObjectKind.Field,
  fieldType: FieldType.Object,
  schemaPointer: parentNodePointer,
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
  schemaPointer: stringNodePointer,
  fieldType: FieldType.String,
};

export const numberNodeMock: UiSchemaNode = {
  ...nodeMockBase,
  schemaPointer: numberNodePointer,
  fieldType: FieldType.Number,
};

export const enumNodeMock: FieldNode = {
  ...nodeMockBase,
  schemaPointer: enumNodePointer,
  fieldType: FieldType.String,
  enum: ['val1', 'val2', 'val3'],
};

export const arrayNodeMock: FieldNode = {
  ...nodeMockBase,
  schemaPointer: arrayNodePointer,
  isArray: true,
};

export const defNodeMock: UiSchemaNode = {
  ...nodeMockBase,
  schemaPointer: defNodePointer,
};

export const optionalNodeMock: UiSchemaNode = {
  ...nodeMockBase,
  schemaPointer: optionalNodePointer,
  isRequired: false,
};

export const requiredNodeMock: UiSchemaNode = {
  ...nodeMockBase,
  schemaPointer: requiredNodePointer,
  isRequired: true,
};

export const referenceNodeMock: ReferenceNode = {
  ...nodeMockBase,
  schemaPointer: referenceNodePointer,
  objectKind: ObjectKind.Reference,
  reference: defNodePointer,
};

export const subParentNodeMock: UiSchemaNode = {
  ...nodeMockBase,
  schemaPointer: subParentNodePointer,
  fieldType: FieldType.Object,
  children: [subSubNodePointer],
};

export const subSubNodeMock: UiSchemaNode = {
  ...nodeMockBase,
  schemaPointer: subSubNodePointer,
  fieldType: FieldType.String,
};

export const allOfNodeMock: CombinationNode = {
  ...nodeMockBase,
  schemaPointer: allOfNodePointer,
  objectKind: ObjectKind.Combination,
  combinationType: CombinationKind.AllOf,
  children: [allOfNodeChildPointer],
};

export const allOfNodeChildMock: UiSchemaNode = {
  ...nodeMockBase,
  schemaPointer: allOfNodeChildPointer,
};

export const simpleParentNodeMock: FieldNode = {
  ...nodeMockBase,
  schemaPointer: simpleParentNodePointer,
  fieldType: FieldType.Object,
  children: [simpleChildNodePointer],
};

export const simpleChildNodeMock: UiSchemaNode = {
  ...nodeMockBase,
  schemaPointer: simpleChildNodePointer,
};

export const simpleArrayMock: FieldNode = {
  ...nodeMockBase,
  schemaPointer: simpleArrayPointer,
  fieldType: FieldType.Object,
  isArray: true,
  children: [simpleArrayItemsPointer],
};

export const simpleArrayItemsMock: UiSchemaNode = {
  ...nodeMockBase,
  schemaPointer: simpleArrayItemsPointer,
};

export const defNodeWithChildrenMock: FieldNode = {
  ...nodeMockBase,
  schemaPointer: defNodeWithChildrenPointer,
  fieldType: FieldType.Object,
  children: [defNodeWithChildrenChildPointer],
};

export const defNodeWithChildrenChildMock: FieldNode = {
  ...nodeMockBase,
  schemaPointer: defNodeWithChildrenChildPointer,
  fieldType: FieldType.Object,
  children: [defNodeWithChildrenGrandchildPointer],
  isArray: true,
};

export const defNodeWithChildrenGrandchildMock: FieldNode = {
  ...nodeMockBase,
  schemaPointer: defNodeWithChildrenGrandchildPointer,
};

export const referenceToObjectNodeMock: ReferenceNode = {
  ...defaultReferenceNode,
  schemaPointer: referenceToObjectNodePointer,
  reference: defNodeWithChildrenPointer,
};

export const unusedDefinitionMock: UiSchemaNode = {
  ...nodeMockBase,
  schemaPointer: unusedDefinitionPointer,
};

export const unusedDefinitionWithSameNameAsExistingObjectMock: UiSchemaNode = {
  ...nodeMockBase,
  schemaPointer: unusedDefinitionWithSameNameAsExistingObjectPointer,
};

export const referenceDefinitionMock: ReferenceNode = {
  ...defaultReferenceNode,
  schemaPointer: referenceDefinitionPointer,
  reference: defNodePointer,
};

export const nodeWithSameNameAsStringNodeMock: FieldNode = {
  ...nodeMockBase,
  schemaPointer: nodeWithSameNameAsStringNodePointer,
  fieldType: FieldType.String,
};

export const combinationNodeWithMultipleChildrenMock: CombinationNode = {
  ...nodeMockBase,
  schemaPointer: combinationNodeWithMultipleChildrenPointer,
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
  schemaPointer: combinationNodeChild1Pointer,
  title: 'Child 1',
};

export const combinationNodeChild2Mock: FieldNode = {
  ...nodeMockBase,
  schemaPointer: combinationNodeChild2Pointer,
  title: 'Child 2',
};

export const combinationNodeChild3Mock: FieldNode = {
  ...nodeMockBase,
  schemaPointer: combinationNodeChild3Pointer,
  title: 'Child 3',
};

export const combinationDefNodeMock: CombinationNode = {
  ...nodeMockBase,
  schemaPointer: combinationDefNodePointer,
  objectKind: ObjectKind.Combination,
  combinationType: CombinationKind.OneOf,
  children: [combinationDefNodeChild1Pointer, combinationDefNodeChild2Pointer],
};

export const combinationDefNodeChild1Mock: FieldNode = {
  ...nodeMockBase,
  schemaPointer: combinationDefNodeChild1Pointer,
};

export const combinationDefNodeChild2Mock: FieldNode = {
  ...nodeMockBase,
  schemaPointer: combinationDefNodeChild2Pointer,
};

export const referenceToCombinationDefNodeMock: ReferenceNode = {
  ...defaultReferenceNode,
  schemaPointer: referenceToCombinationDefNodePointer,
  reference: combinationDefNodePointer,
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
  combinationDefNodeMock,
  combinationDefNodeChild1Mock,
  combinationDefNodeChild2Mock,
  referenceToCombinationDefNodeMock,
];
