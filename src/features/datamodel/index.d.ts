import type { JSONSchema7 } from 'json-schema';

export interface IJsonSchemas {
  [id: string]: JSONSchema7;
}

export interface IDataModelState {
  schemas: IJsonSchemas;
}

export interface IFetchJsonSchemaFulfilled {
  schema: JSONSchema7;
  id: string;
}

export interface IFetchJsonSchemaRejected {
  error: Error | null;
}
