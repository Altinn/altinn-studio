import { JsonSchema } from '@altinn/schema-editor/types/JsonSchema';
import type { UiSchemaNodes } from '@altinn/schema-model';

export interface SchemaState {
  schema: JsonSchema;
  uiSchema: UiSchemaNodes;
  name: string;
  saveSchemaUrl: string;
  selectedDefinitionNodeId: string;
  selectedPropertyNodeId: string;
  focusNameField?: string; // used to trigger focus of name field in inspector.
  navigate?: string; // used to trigger navigation in tree, the value is not used.
  selectedEditorTab: 'definitions' | 'properties';
}
