export interface IFetchFormData {
  url: string;
}

export interface IFetchFormDataFulfilled {
  formData: any;
}

export interface IFormDataRejected {
  error: Error;
}

export interface ISubmitDataAction {
  apiMode?: string;
  stopWithWarnings?: boolean;
}

export interface IUpdateFormData {
  field: string;
  data: any;
  componentId?: string;
  skipValidation?: boolean;
  skipAutoSave?: boolean;
}

export interface IUpdateFormDataFulfilled {
  field: string;
  data: any;
}
