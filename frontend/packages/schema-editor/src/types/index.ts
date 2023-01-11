export { LanguageTree as ILanguage } from 'app-shared/utils/language';
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
  InvalidCharacter = 'nameError_invalidCharacter',
  AlreadyInUse = 'nameError_alreadyInUse',
  NoError = '',
}
