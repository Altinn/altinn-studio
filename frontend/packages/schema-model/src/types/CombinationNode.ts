import { ObjectKind } from './ObjectKind';
import { CombinationKind } from './CombinationKind';
import { KeyValuePairs } from 'app-shared/types/KeyValuePairs';

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
