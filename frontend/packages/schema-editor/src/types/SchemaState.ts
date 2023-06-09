import type { UiSchemaNodes } from '@altinn/schema-model';
import { JSONSchema7 } from 'json-schema';

export interface SchemaState {
  schema: JSONSchema7;
  uiSchema: UiSchemaNodes;
  name: string;
  saveSchemaUrl: string;
  selectedDefinitionNodeId: string;
  selectedPropertyNodeId: string;
  focusNameField?: string; // used to trigger focus of name field in inspector.
  navigate?: string; // used to trigger navigation in tree, the value is not used.
  selectedEditorTab: 'definitions' | 'properties';
}
