import type {
  CombinationNode,
  FieldNode,
  ReferenceNode,
  UiSchemaNodes,
} from '@altinn/schema-model';
import { CombinationKind, FieldType, ObjectKind, ROOT_POINTER } from '@altinn/schema-model';
import { nodeMockBase } from '../../../../test/mocks/uiSchemaMock';

export const objectDefinitionPointer = '#/$defs/objectDefinition';
export const stringDefinitionPointer = '#/$defs/stringDefinition';
export const integerDefinitionPointer = '#/$defs/integerDefinition';
export const numberDefinitionPointer = '#/$defs/numberDefinition';
export const booleanDefinitionPointer = '#/$defs/booleanDefinition';
export const combinationDefinitionPointer = '#/$defs/combinationDefinition';
export const objectRefPointer = '#/$defs/objectRef';
export const stringRefPointer = '#/$defs/stringRef';
export const integerRefPointer = '#/$defs/integerRef';
export const numberRefPointer = '#/$defs/numberRef';
export const booleanRefPointer = '#/$defs/booleanRef';
export const combinationRefPointer = '#/$defs/combinationRef';
export const unusedObjectDefinitionPointer = '#/$defs/unusedObjectDefinition';
export const unusedStringDefinitionPointer = '#/$defs/unusedStringDefinition';
export const unusedIntegerDefinitionPointer = '#/$defs/unusedIntegerDefinition';
export const unusedNumberDefinitionPointer = '#/$defs/unusedNumberDefinition';
export const unusedBooleanDefinitionPointer = '#/$defs/unusedBooleanDefinition';
export const unusedCombinationDefinitionPointer = '#/$defs/unusedCombinationDefinition';

const rootNodeMock: FieldNode = {
  ...nodeMockBase,
  objectKind: ObjectKind.Field,
  fieldType: FieldType.Object,
  pointer: ROOT_POINTER,
  children: [
    objectDefinitionPointer,
    stringDefinitionPointer,
    integerDefinitionPointer,
    numberDefinitionPointer,
    booleanDefinitionPointer,
    combinationDefinitionPointer,
    objectRefPointer,
    stringRefPointer,
    integerRefPointer,
    numberRefPointer,
    booleanRefPointer,
    combinationRefPointer,
    unusedObjectDefinitionPointer,
    unusedStringDefinitionPointer,
    unusedIntegerDefinitionPointer,
    unusedNumberDefinitionPointer,
    unusedBooleanDefinitionPointer,
    unusedCombinationDefinitionPointer,
  ],
};

const objectDefinitionMock: FieldNode = {
  ...nodeMockBase,
  objectKind: ObjectKind.Field,
  fieldType: FieldType.Object,
  pointer: objectDefinitionPointer,
  children: [],
};

const stringDefinitionMock: FieldNode = {
  ...nodeMockBase,
  objectKind: ObjectKind.Field,
  fieldType: FieldType.String,
  pointer: stringDefinitionPointer,
};

const integerDefinitionMock: FieldNode = {
  ...nodeMockBase,
  objectKind: ObjectKind.Field,
  fieldType: FieldType.Integer,
  pointer: integerDefinitionPointer,
};

const numberDefinitionMock: FieldNode = {
  ...nodeMockBase,
  objectKind: ObjectKind.Field,
  fieldType: FieldType.Number,
  pointer: numberDefinitionPointer,
};

const booleanDefinitionMock: FieldNode = {
  ...nodeMockBase,
  objectKind: ObjectKind.Field,
  fieldType: FieldType.Boolean,
  pointer: booleanDefinitionPointer,
};

const combinationDefinitionMock: CombinationNode = {
  ...nodeMockBase,
  objectKind: ObjectKind.Combination,
  combinationType: CombinationKind.AnyOf,
  pointer: combinationDefinitionPointer,
};

const objectRefMock: ReferenceNode = {
  ...nodeMockBase,
  objectKind: ObjectKind.Reference,
  pointer: objectRefPointer,
  reference: objectDefinitionPointer,
};

const stringRefMock: ReferenceNode = {
  ...nodeMockBase,
  objectKind: ObjectKind.Reference,
  pointer: stringRefPointer,
  reference: stringDefinitionPointer,
};

const integerRefMock: ReferenceNode = {
  ...nodeMockBase,
  objectKind: ObjectKind.Reference,
  pointer: integerRefPointer,
  reference: integerDefinitionPointer,
};

const numberRefMock: ReferenceNode = {
  ...nodeMockBase,
  objectKind: ObjectKind.Reference,
  pointer: numberRefPointer,
  reference: numberDefinitionPointer,
};

const booleanRefMock: ReferenceNode = {
  ...nodeMockBase,
  objectKind: ObjectKind.Reference,
  pointer: booleanRefPointer,
  reference: booleanDefinitionPointer,
};

const combinationRefMock: ReferenceNode = {
  ...nodeMockBase,
  objectKind: ObjectKind.Reference,
  pointer: combinationRefPointer,
  reference: combinationDefinitionPointer,
};

const unusedObjectDefinitionMock: FieldNode = {
  ...nodeMockBase,
  objectKind: ObjectKind.Field,
  fieldType: FieldType.Object,
  pointer: unusedObjectDefinitionPointer,
};

const unusedStringDefinitionMock: FieldNode = {
  ...nodeMockBase,
  objectKind: ObjectKind.Field,
  fieldType: FieldType.String,
  pointer: unusedStringDefinitionPointer,
};

const unusedIntegerDefinitionMock: FieldNode = {
  ...nodeMockBase,
  objectKind: ObjectKind.Field,
  fieldType: FieldType.Integer,
  pointer: unusedIntegerDefinitionPointer,
};

const unusedNumberDefinitionMock: FieldNode = {
  ...nodeMockBase,
  objectKind: ObjectKind.Field,
  fieldType: FieldType.Number,
  pointer: unusedNumberDefinitionPointer,
};

const unusedBooleanDefinitionMock: FieldNode = {
  ...nodeMockBase,
  objectKind: ObjectKind.Field,
  fieldType: FieldType.Boolean,
  pointer: unusedBooleanDefinitionPointer,
};

const unusedCombinationDefinitionMock: CombinationNode = {
  ...nodeMockBase,
  objectKind: ObjectKind.Combination,
  combinationType: CombinationKind.AnyOf,
  pointer: unusedCombinationDefinitionPointer,
};

export const schemaNodesMock: UiSchemaNodes = [
  rootNodeMock,
  objectDefinitionMock,
  stringDefinitionMock,
  integerDefinitionMock,
  numberDefinitionMock,
  booleanDefinitionMock,
  combinationDefinitionMock,
  objectRefMock,
  stringRefMock,
  integerRefMock,
  numberRefMock,
  booleanRefMock,
  combinationRefMock,
  unusedObjectDefinitionMock,
  unusedStringDefinitionMock,
  unusedIntegerDefinitionMock,
  unusedNumberDefinitionMock,
  unusedBooleanDefinitionMock,
  unusedCombinationDefinitionMock,
];
