import type { CombinationNode } from '../types/CombinationNode';
import { CombinationKind, FieldType, ObjectKind } from '../types';
import type { FieldNode } from '../types/FieldNode';
import type { ReferenceNode } from '../types/ReferenceNode';

export const defaultCombinationNode: CombinationNode = {
  children: [],
  combinationType: CombinationKind.AnyOf,
  custom: {},
  implicitType: true,
  isArray: false,
  isNillable: false,
  isRequired: false,
  objectKind: ObjectKind.Combination,
  schemaPointer: '',
  restrictions: {},
};

export const defaultReferenceNode: ReferenceNode = {
  custom: {},
  implicitType: true,
  isArray: false,
  isNillable: false,
  isRequired: false,
  objectKind: ObjectKind.Reference,
  schemaPointer: '',
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
  schemaPointer: '',
  restrictions: {},
};
