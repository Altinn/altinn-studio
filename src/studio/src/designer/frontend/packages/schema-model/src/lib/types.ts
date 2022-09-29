export enum ObjectKind {
  Combination = 'combination',
  Field = 'field',
  Reference = 'reference',
  Array = 'array',
}

/** Types */
export enum CombinationKind {
  AllOf = 'allOf',
  AnyOf = 'anyOf',
  OneOf = 'oneOf',
}

/**
 * @link https://json-schema.org/understanding-json-schema/reference/type.html
 */
export enum FieldType {
  String = 'string',
  Integer = 'integer',
  Number = 'number',
  Boolean = 'boolean',
  Object = 'object',
  Array = 'array',
  Null = 'null',
}

export const ROOT_POINTER = '#';

export interface JsonSchemaNode {
  [key: string]: any;
}

export type UiSchemaNodes = UiSchemaNode[];

export interface UiSchemaNode {
  objectKind: ObjectKind;
  fieldType: FieldType | CombinationKind;
  implicitType: boolean; // the
  isNillable: boolean;
  isCombinationItem: boolean;
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
