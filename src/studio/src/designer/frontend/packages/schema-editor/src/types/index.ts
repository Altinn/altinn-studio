export interface ISchemaState {
  schema: ISchema;
  uiSchema: UiSchemaItem[];
  rootName: string;
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
export interface ISetRefAction {
  path: string,
  ref: string,
}
export type Field = {
  key: string;
  value: any;
}

export type UiSchemaItem = {
  id: string;
  $ref?: string;
  keywords?: Field[];
  properties?: UiSchemaItem[];
  value?: any;
  name?: string;
  required?: string[];
}
export interface ISchema {
  properties: { [key: string]: UiSchemaItem };
  definitions: { [key: string]: UiSchemaItem };
}
