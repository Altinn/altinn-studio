import type { IDataModelBindings } from 'src/layout/layout';

export interface IFetchFormData {
  url: string;
}

export interface IFetchFormDataFulfilled {
  formData: any;
}

export interface IFormDataRejected {
  error: Error | null;
}

export interface ISubmitDataAction {
  url?: string;
  componentId: string;
}

export interface ISingleFieldValidation {
  layoutId: string;
  dataModelBinding: string;
}

export interface ISaveAction {
  field?: string;
  componentId?: string;
  singleFieldValidation?: ISingleFieldValidation;
}

export interface IUpdateFormData {
  skipValidation?: boolean;
  skipAutoSave?: boolean;
  singleFieldValidation?: ISingleFieldValidation;
  componentId?: string;
  field: string;
  data: any;
}

export interface IDeleteAttachmentReference {
  attachmentId: string;
  componentId: string;
  dataModelBindings: IDataModelBindings;
}
