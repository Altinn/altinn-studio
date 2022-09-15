import { ObjectKind } from '../types/enums';
import { CombinationKind, FieldType } from '../types';

export const ROOT_POINTER = '#';

export interface JsonSchemaNode {
  [key: string]: any;
}

export interface UiSchemaNode {
  nodeId: string;
  objectKind: ObjectKind;
  fieldType: FieldType | CombinationKind;
  implicitType: boolean; // the
  isNillable: boolean;
  pointer: string;
  ref?: string;
  custom: JsonSchemaNode;
  children: string[];
  description?: string;
  enum?: string[];
  isRequired: boolean;
  title?: string;
  value?: any;
  restrictions: JsonSchemaNode;
  default?: any;
  const?: any;
}

/**
 * These are the keywords that we actually support. The rest will be put into the `custom`-object at the ui-schema.
 */
export enum Keywords {
  Const = 'const',
  Default = 'default',
  Definitions = '$defs',
  Description = 'description',
  Enum = 'enum',
  Items = 'items',
  Properties = 'properties',
  Reference = '$ref',
  Required = 'required',
  Title = 'title',
  Type = 'type',
}
