import {
  CombinationKind,
  CombinationNode,
  FieldNode,
  FieldType,
  ObjectKind,
  UiSchemaNode,
  UiSchemaNodes,
} from '../src';
import { ReferenceNode } from '../src';
import { defaultReferenceNode } from '../src/config/default-nodes';

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
const referenceNodePointer = '#/properties/test/anyOf/referenceNode';
const subParentNodePointer = '#/properties/test/anyOf/subParent';
const subSubNodePointer = '#/properties/test/anyOf/subParent/properties/subSubNode';

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
  ],
};

export const parentNodeMock: CombinationNode = {
  ...nodeMockBase,
  objectKind: ObjectKind.Combination,
  combinationType: CombinationKind.AnyOf,
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
];
