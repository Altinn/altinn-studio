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
export interface ISetValueAction {
  path: string,
  value: any,
  key?: string,
}
export interface ISetTypeAction {
  path: string;
  value: string;
}
export interface ISetRefAction {
  path: string,
  ref: string,
}

export type ObjectKind = 'combination' | 'reference' | 'field';

export type CombinationKind = 'allOf' | 'anyOf' | 'oneOf';

export type Field = {
  key: string;
  value: any;
}

export interface UiSchemaItem {
  path: string;
  type?: string;
  $ref?: string;
  restrictions?: Field[];
  properties?: UiSchemaItem[];
  value?: any;
  displayName: string;
  required?: string[];
  title?: string;
  description?: string;
  items?: { type?: string, $ref?: string };
  enum?: string[];
  combination?: UiSchemaItem[];
  combinationKind?: CombinationKind;
  combinationItem?: boolean,
}

export interface ISchema {
  properties: { [key: string]: {[key: string]: any} };
  definitions: { [key: string]: {[key: string]: any} };
  $schema?: string
  $id?: string;
}
