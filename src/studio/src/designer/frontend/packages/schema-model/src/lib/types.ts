export enum ObjectKind {
  Combination = 'combination',
  Field = 'field',
  Reference = 'reference',
}

export enum CombinationKind {
  AllOf = 'allOf',
  AnyOf = 'anyOf',
  OneOf = 'oneOf',
}

// @link https://json-schema.org/understanding-json-schema/reference/type.html
// These are the ones that is handled in the ui-model. `array`-keyword is just for json-schemas
export enum FieldType {
  String = 'string',
  Integer = 'integer',
  Number = 'number',
  Boolean = 'boolean',
  Object = 'object',
  Null = 'null',
}
export enum JsonSchemaType {
  Array = 'array',
}

export enum SpecialArrayXsdFields {
  minOccurs = '@xsdMinOccurs',
  maxOccurs = '@xsdMaxOccurs',
}

// These are the keywords that we actually support. The rest will be put into the `custom`-object at the ui-schema.
export enum Keywords {
  Const = 'const',
  Default = 'default',
  Definitions = '$defs',
  DeprecatedDefinitions = 'definitions',
  Description = 'description',
  Enum = 'enum',
  Items = 'items',
  Properties = 'properties',
  Reference = '$ref',
  Required = 'required',
  Title = 'title',
  Type = 'type',
}

// Just to be able to track where this is used for future reference
export enum UnhandledKeywords {
  Schema = '$schema',
}

export interface Dict {
  [key: string]: any;
}

export type UiSchemaNodes = UiSchemaNode[];

export interface UiSchemaNode {
  objectKind: ObjectKind;
  fieldType: FieldType | CombinationKind;
  implicitType: boolean;
  isNillable: boolean;
  isCombinationItem: boolean;
  isArray: boolean;
  pointer: string;
  ref?: string;
  custom: Dict;
  children: string[];
  description?: string;
  enum?: string[];
  isRequired: boolean;
  title?: string;
  value?: any;
  restrictions: Dict;
  default?: any;
  const?: any;
  format?: StringFormat;
}

export enum StringFormat {
  Date = 'date',
  DateTime = 'date-time',
  Time = 'time',
  Duration = 'duration',
  Email = 'email',
  IdnEmail = 'idn-email',
  Hostname = 'hostname',
  IdnHostname = 'idn-hostname',
  Ipv4 = 'ipv4',
  Ipv6 = 'ipv6',
  Uuid = 'uuid',
  Uri = 'uri',
  UriReference = 'uri-reference',
  Iri = 'iri',
  IriReference = 'iri-reference',
  UriTemplate = 'uri-template',
  JsonPointer = 'json-pointer',
  RelativeJsonPointer = 'relative-json-pointer',
  Regex = 'regex',
}
