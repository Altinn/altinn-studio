/*
 * Keywords that we actually support. The rest will be put into the `custom` object in the UI schema.
 */
export enum Keyword {
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
