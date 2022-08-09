/** Interfaces */
export interface ILanguage {
  [key: string]: string | ILanguage;
}

export interface ISchema {
  properties: { [key: string]: { [key: string]: any } };
  definitions: { [key: string]: { [key: string]: any } };
  $schema?: string;
  $id?: string;
}

export interface ISchemaState {
  schema: ISchema;
  uiSchema: IUiSchemaItem[];
  name: string;
  saveSchemaUrl: string;
  selectedDefinitionNodeId: string;
  selectedPropertyNodeId: string;
  focusNameField?: string; // used to trigger focus of name field in inspector.
  navigate?: string; // used to trigger navigation in tree, the value is not used.
  selectedEditorTab: 'definitions' | 'properties';
}

export interface IUiSchemaItem {
  path: string;
  type?: FieldType;
  $ref?: string;
  restrictions?: Restriction[];
  properties?: IUiSchemaItem[];
  value?: any;
  displayName: string;
  required?: string[];
  title?: string;
  description?: string;
  items?: { type?: string; $ref?: string };
  enum?: string[];
  combination?: IUiSchemaItem[];
  combinationKind?: CombinationKind;
  combinationItem?: boolean;
}

/** Types */
export type CombinationKind = 'allOf' | 'anyOf' | 'oneOf';

export type FieldType =
  | 'string'
  | 'integer'
  | 'number'
  | 'boolean'
  | 'object'
  | 'array'
  | 'null';

export type NameInUseProps = {
  uiSchemaItems: IUiSchemaItem[];
  parentSchema: IUiSchemaItem | null;
  path: string;
  name: string;
};

export type Restriction = {
  key: string;
  value: any;
};

