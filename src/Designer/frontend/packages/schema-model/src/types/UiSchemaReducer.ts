import type { SchemaModel } from '../lib/SchemaModel';

export type UiSchemaReducer<T> = (uiSchema: SchemaModel, args: T) => SchemaModel;
