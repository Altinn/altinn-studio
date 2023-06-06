import { StringFormat } from '../types';
import { ObjectKind } from './ObjectKind';
import { FieldType } from './FieldType';
import { CombinationKind } from './CombinationKind';
import { KeyValuePairs } from 'app-shared/types/KeyValuePairs';

export interface UiSchemaNode {
  objectKind: ObjectKind;
  fieldType: FieldType | CombinationKind;
  implicitType: boolean;
  isNillable: boolean;
  isCombinationItem: boolean;
  isArray: boolean;
  pointer: string;
  reference?: string;
  custom: KeyValuePairs;
  children: string[];
  description?: string;
  enum?: string[];
  isRequired: boolean;
  title?: string;
  value?: any;
  restrictions: KeyValuePairs;
  default?: any;
  format?: StringFormat;
}
