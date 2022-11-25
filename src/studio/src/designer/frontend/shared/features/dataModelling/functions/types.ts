import type { IDataModelMetadataItem } from '../sagas/metadata';

export interface IMetadataOption {
  label: string;
  value?: IDataModelMetadataItem;
}

export enum DatamodelType {
  JsonSchema = 'JsonSchema',
  Xsd = 'Xsd',
}
