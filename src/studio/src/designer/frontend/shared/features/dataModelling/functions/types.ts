import type { IDataModelMetadataItem } from '../sagas/metadata';

export interface IMetadataOption {
  value?: IDataModelMetadataItem;
  label: string;
}

export enum DatamodelType {
  JsonSchema = 'JsonSchema',
  Xsd = 'Xsd',
}
