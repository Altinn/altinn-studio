export enum ItemType {
  Property,
  Value,
  Ref,
}
export interface ISchemaState {
  schema: ISchema;
  uiSchema: UiSchemaItem[];
  rootName: string;
  saveSchemaUrl: string;
  selectedId?: string;
}

export interface ISetValueAction {
  path: string,
  value: any,
  key?: string,
}

export type Field = {
  key: string;
  value: any;
}

export type UiSchemaItem = {
  id: string;
  $ref?: string;
  fields?: Field[];
  properties?: UiSchemaItem[];
  value?: any;
  name?: string;
}
export interface ISchema {
  properties: { [key: string]: UiSchemaItem };
  definitions: { [key: string]: UiSchemaItem };
}
