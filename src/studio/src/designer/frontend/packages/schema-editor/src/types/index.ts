export interface ISchemaState {
  schema: ISchema;
  uiSchema: UiSchemaItem[];
  name: string;
  saveSchemaUrl: string;
  selectedId?: string;
  selectedNodeId?: string;
}
export interface ILanguage {
  [key: string]: string;
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
export type Field = {
  key: string;
  value: any;
}

export interface UiSchemaItem {
  id: string;
  type?: string;
  $ref?: string;
  restrictions?: Field[];
  properties?: UiSchemaItem[];
  value?: any;
  displayName: string;
  required?: string[];
  title?: string;
  description?: string;
  items?: {type?: string, $ref?: string};
}

export interface ISchema {
  properties: { [key: string]: {[key: string]: any} };
  definitions: { [key: string]: {[key: string]: any} };
  $schema?: string
  $id?: string;
}
