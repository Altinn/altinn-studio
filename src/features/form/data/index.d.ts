export interface IFormDataState {
  formData: IFormData;
  error: Error | null;
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
