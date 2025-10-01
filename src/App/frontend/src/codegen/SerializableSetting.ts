/**
 * This interface is used to define the structure of a setting that can be serialized.
 * This is mostly used for Plugin settings that need to be passed as constructor arguments in generated classes.
 */
export interface SerializableSetting {
  serializeToTypeScript(): string;
  serializeToTypeDefinition(): string;
}
