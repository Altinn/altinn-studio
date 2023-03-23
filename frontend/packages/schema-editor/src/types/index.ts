/** Interfaces */
import type { UiSchemaNodes } from '@altinn/schema-model';
export interface IJsonSchema {
  properties?: { [key: string]: { [key: string]: any } };
  $defs?: { [key: string]: { [key: string]: any } };
  $schema?: string;
  $id?: string;
  [key: string]: any;
}

export interface ISchemaState {
  schema: IJsonSchema;
  uiSchema: UiSchemaNodes;
  name: string;
  saveSchemaUrl: string;
  selectedDefinitionNodeId: string;
  selectedPropertyNodeId: string;
  focusNameField?: string; // used to trigger focus of name field in inspector.
  navigate?: string; // used to trigger navigation in tree, the value is not used.
  selectedEditorTab: 'definitions' | 'properties';
}

export enum NameError {
  InvalidCharacter = 'InvalidCharacter',
  AlreadyInUse = 'AlreadyInUse',
  NoError = 'NoError'
}

export enum NumberRestrictionsError {
  NoError = 'NoError',
  Decimal_One_value_should_be__exclusive = "Decimal_One_value_should_be__exclusive",
  MinMustBeLessThanOrEqualToMax = "MinMustBeLessThanOrEqualToMax ",
  MinMustBeLessThanMax = "MinMustBeLessThanMax",
  IntervalMustBeLargeEnough = "IntervalMustBeLargeEnough "
}
