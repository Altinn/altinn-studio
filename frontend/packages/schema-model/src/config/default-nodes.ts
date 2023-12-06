import { CombinationNode } from '../types/CombinationNode';
import { CombinationKind, FieldType, ObjectKind } from '../types';
import { FieldNode } from '../types/FieldNode';
import { ReferenceNode } from '../types/ReferenceNode';

export const defaultCombinationNode: CombinationNode = {
  children: [],
  combinationType: CombinationKind.AnyOf,
  custom: {},
  implicitType: true,
  isArray: false,
  isNillable: false,
  isRequired: false,
  objectKind: ObjectKind.Combination,
  pointer: '',
  restrictions: {},
};

export const defaultReferenceNode: ReferenceNode = {
  custom: {},
  implicitType: true,
  isArray: false,
  isNillable: false,
  isRequired: false,
  objectKind: ObjectKind.Reference,
  pointer: '',
  reference: '',
  restrictions: {},
};

export const defaultFieldNode: FieldNode = {
  children: [],
  custom: {},
  fieldType: FieldType.String,
  implicitType: true,
  isArray: false,
  isNillable: false,
  isRequired: false,
  objectKind: ObjectKind.Field,
  pointer: '',
  restrictions: {},
};
