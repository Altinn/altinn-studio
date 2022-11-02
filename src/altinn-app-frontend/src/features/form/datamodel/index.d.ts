export interface IJsonSchemas {
  [id: string]: object;
}

export interface IDataModelState {
  schemas: IJsonSchemas;
  error: Error | null;
}

export interface IFetchJsonSchemaFulfilled {
  schema: object;
  id: string;
}

export interface IFetchJsonSchemaRejected {
  error: Error;
}
