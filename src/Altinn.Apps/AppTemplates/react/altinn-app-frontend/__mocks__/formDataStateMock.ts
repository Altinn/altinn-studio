import { IFormDataState } from '../src/features/form/data/formDataReducer';

export function getFormDataStateMock(customState?: Partial<IFormDataState>) {
  const formData: IFormDataState = {
    error: null,
    formData: {},
    hasSubmitted: false,
    isSaving: false,
    isSubmitting: false,
    responseInstance: false,
    unsavedChanges: false,
  };

  return { ...formData, ...customState };
}
