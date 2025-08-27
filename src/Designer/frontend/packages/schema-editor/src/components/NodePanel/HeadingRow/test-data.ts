import type {
  CombinationNode,
  FieldNode,
  ReferenceNode,
  UiSchemaNodes,
} from '@altinn/schema-model/index';
import { CombinationKind, FieldType, ObjectKind, ROOT_POINTER } from '@altinn/schema-model/index';
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
  schemaPointer: ROOT_POINTER,
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
  schemaPointer: objectDefinitionPointer,
  children: [],
};

const stringDefinitionMock: FieldNode = {
  ...nodeMockBase,
  objectKind: ObjectKind.Field,
  fieldType: FieldType.String,
  schemaPointer: stringDefinitionPointer,
};

const integerDefinitionMock: FieldNode = {
  ...nodeMockBase,
  objectKind: ObjectKind.Field,
  fieldType: FieldType.Integer,
  schemaPointer: integerDefinitionPointer,
};

const numberDefinitionMock: FieldNode = {
  ...nodeMockBase,
  objectKind: ObjectKind.Field,
  fieldType: FieldType.Number,
  schemaPointer: numberDefinitionPointer,
};

const booleanDefinitionMock: FieldNode = {
  ...nodeMockBase,
  objectKind: ObjectKind.Field,
  fieldType: FieldType.Boolean,
  schemaPointer: booleanDefinitionPointer,
};

const combinationDefinitionMock: CombinationNode = {
  ...nodeMockBase,
  objectKind: ObjectKind.Combination,
  combinationType: CombinationKind.AnyOf,
  schemaPointer: combinationDefinitionPointer,
};

const objectRefMock: ReferenceNode = {
  ...nodeMockBase,
  objectKind: ObjectKind.Reference,
  schemaPointer: objectRefPointer,
  reference: objectDefinitionPointer,
};

const stringRefMock: ReferenceNode = {
  ...nodeMockBase,
  objectKind: ObjectKind.Reference,
  schemaPointer: stringRefPointer,
  reference: stringDefinitionPointer,
};

const integerRefMock: ReferenceNode = {
  ...nodeMockBase,
  objectKind: ObjectKind.Reference,
  schemaPointer: integerRefPointer,
  reference: integerDefinitionPointer,
};

const numberRefMock: ReferenceNode = {
  ...nodeMockBase,
  objectKind: ObjectKind.Reference,
  schemaPointer: numberRefPointer,
  reference: numberDefinitionPointer,
};

const booleanRefMock: ReferenceNode = {
  ...nodeMockBase,
  objectKind: ObjectKind.Reference,
  schemaPointer: booleanRefPointer,
  reference: booleanDefinitionPointer,
};

const combinationRefMock: ReferenceNode = {
  ...nodeMockBase,
  objectKind: ObjectKind.Reference,
  schemaPointer: combinationRefPointer,
  reference: combinationDefinitionPointer,
};

const unusedObjectDefinitionMock: FieldNode = {
  ...nodeMockBase,
  objectKind: ObjectKind.Field,
  fieldType: FieldType.Object,
  schemaPointer: unusedObjectDefinitionPointer,
};

const unusedStringDefinitionMock: FieldNode = {
  ...nodeMockBase,
  objectKind: ObjectKind.Field,
  fieldType: FieldType.String,
  schemaPointer: unusedStringDefinitionPointer,
};

const unusedIntegerDefinitionMock: FieldNode = {
  ...nodeMockBase,
  objectKind: ObjectKind.Field,
  fieldType: FieldType.Integer,
  schemaPointer: unusedIntegerDefinitionPointer,
};

const unusedNumberDefinitionMock: FieldNode = {
  ...nodeMockBase,
  objectKind: ObjectKind.Field,
  fieldType: FieldType.Number,
  schemaPointer: unusedNumberDefinitionPointer,
};

const unusedBooleanDefinitionMock: FieldNode = {
  ...nodeMockBase,
  objectKind: ObjectKind.Field,
  fieldType: FieldType.Boolean,
  schemaPointer: unusedBooleanDefinitionPointer,
};

const unusedCombinationDefinitionMock: CombinationNode = {
  ...nodeMockBase,
  objectKind: ObjectKind.Combination,
  combinationType: CombinationKind.AnyOf,
  schemaPointer: unusedCombinationDefinitionPointer,
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
