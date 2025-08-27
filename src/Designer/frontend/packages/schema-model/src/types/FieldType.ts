/**
 * @link https://json-schema.org/understanding-json-schema/reference/type.html
 * These are the field types that are handled in the UI model.
 */
export enum FieldType {
  String = 'string',
  Integer = 'integer',
  Number = 'number',
  Boolean = 'boolean',
  Object = 'object',
  Null = 'null',
}

/*
 * Field types for JSON schemas only.
 */
export enum JsonSchemaType {
  Array = 'array',
}
