import type { ObjectKind } from './ObjectKind';
import type { FieldType } from './FieldType';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import type { StringFormat } from './StringFormat';

export interface FieldNode {
  objectKind: ObjectKind.Field;
  fieldType: FieldType;
  implicitType: boolean;
  isNillable: boolean;
  isArray: boolean;
  pointer: string;
  custom: KeyValuePairs;
  children: string[];
  definitions?: string[];
  description?: string;
  enum?: string[];
  isRequired: boolean;
  title?: string;
  value?: any;
  restrictions: KeyValuePairs;
  default?: any;
  format?: StringFormat;
}
