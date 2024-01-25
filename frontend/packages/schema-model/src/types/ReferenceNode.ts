import type { ObjectKind } from './ObjectKind';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';

export type ReferenceNode = {
  objectKind: ObjectKind.Reference;
  pointer: string;
  reference?: string;
  custom: KeyValuePairs;
  description?: string;
  isArray: boolean;
  isNillable: boolean;
  isRequired: boolean;
  title?: string;
  restrictions: KeyValuePairs;
  implicitType: boolean;
};
