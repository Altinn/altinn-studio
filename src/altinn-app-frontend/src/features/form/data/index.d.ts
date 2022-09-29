export interface IFormDataState {
  formData: IFormData;
  error: Error;
  responseInstance: any;
  unsavedChanges: boolean;
  submittingId: string;
  savingId: string;
  hasSubmitted: boolean;
  ignoreWarnings: boolean;
}

export interface IFormData {
  [dataFieldKey: string]: string;
}
