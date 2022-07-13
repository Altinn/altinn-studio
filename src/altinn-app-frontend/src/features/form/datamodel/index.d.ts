export interface IJsonSchemas {
  [id: string]: object;
}

export interface IDataModelState {
  schemas: IJsonSchemas;
  error: Error;
}

export interface IFetchJsonSchemaFulfilled {
  schema: object;
  id: string;
}

export interface IFetchJsonSchemaRejected {
  error: Error;
}
