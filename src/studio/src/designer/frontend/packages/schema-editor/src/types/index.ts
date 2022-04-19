export interface ISchemaState {
  schema: ISchema;
  uiSchema: UiSchemaItem[];
  name: string;
  saveSchemaUrl: string;
  selectedDefinitionNodeId: string;
  selectedPropertyNodeId: string;
  focusNameField?: string; // used to trigger focus of name field in inspector.
  navigate?: string; // used to trigger navigation in tree, the value is not used.
  selectedEditorTab: 'definitions' | 'properties';
}
export interface ILanguage {
  [key: string]: string | ILanguage;
}

export type FieldType =
  | 'string'
  | 'integer'
  | 'number'
  | 'boolean'
  | 'object'
  | 'array'
  | 'null';

export type ObjectKind = 'combination' | 'reference' | 'field';

export type CombinationKind = 'allOf' | 'anyOf' | 'oneOf';

export type Restriction = {
  key: string;
  value: any;
};

export interface UiSchemaItem {
  path: string;
  type?: FieldType;
  $ref?: string;
  restrictions?: Restriction[];
  properties?: UiSchemaItem[];
  value?: any;
  displayName: string;
  required?: string[];
  title?: string;
  description?: string;
  items?: { type?: string; $ref?: string };
  enum?: string[];
  combination?: UiSchemaItem[];
  combinationKind?: CombinationKind;
  combinationItem?: boolean;
}

export interface ISchema {
  properties: { [key: string]: { [key: string]: any } };
  definitions: { [key: string]: { [key: string]: any } };
  $schema?: string;
  $id?: string;
}
