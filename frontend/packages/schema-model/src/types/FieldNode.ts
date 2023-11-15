import { ObjectKind } from './ObjectKind';
import { FieldType } from './FieldType';
import { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import { StringFormat } from './StringFormat';

export interface FieldNode {
  objectKind: ObjectKind.Field;
  fieldType: FieldType;
  implicitType: boolean;
  isNillable: boolean;
  isArray: boolean;
  pointer: string;
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
