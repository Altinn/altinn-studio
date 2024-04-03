import type { ObjectKind } from './ObjectKind';
import type { CombinationKind } from './CombinationKind';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';

export type CombinationNode = {
  objectKind: ObjectKind.Combination;
  combinationType: CombinationKind;
  pointer: string;
  custom: KeyValuePairs;
  children: string[];
  description?: string;
  isArray: boolean;
  isNillable: boolean;
  isRequired: boolean;
  title?: string;
  restrictions: KeyValuePairs;
  implicitType: boolean;
};
