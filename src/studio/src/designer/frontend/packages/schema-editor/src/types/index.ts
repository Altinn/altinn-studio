export enum ItemType {
  Property,
  Value,
  Ref,
}

export interface ISchemaState {
  schema: any;
  uiSchema: any[];
  rootName: string;
  saveSchemaUrl: string;
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
}
