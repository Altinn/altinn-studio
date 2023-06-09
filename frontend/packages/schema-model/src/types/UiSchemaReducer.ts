import { UiSchemaNodes } from './UiSchemaNodes';

export type UiSchemaReducer<T> = (uiSchema: UiSchemaNodes, args: T) => UiSchemaNodes;
