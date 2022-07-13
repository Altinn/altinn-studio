export interface IFormDataState {
  formData: IFormData;
  error: Error;
  responseInstance: any;
  unsavedChanges: boolean;
  isSubmitting: boolean;
  isSaving: boolean;
  hasSubmitted: boolean;
  ignoreWarnings: boolean;
}

export interface IFormData {
  [dataFieldKey: string]: string;
}
