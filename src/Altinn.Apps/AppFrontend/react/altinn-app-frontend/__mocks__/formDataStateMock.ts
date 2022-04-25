import { IFormDataState } from '../src/features/form/data/formDataReducer';

export function getFormDataStateMock(customState?: Partial<IFormDataState>) {
  const formData: IFormDataState = {
    error: null,
    formData: {
      'someGroup[0].labelField': 'Label for first',
      'someGroup[1].labelField': 'Label for second',
      'someGroup[0].valueField': 'Value for first',
      'someGroup[1].valueField': 'Value for second',
    },
    hasSubmitted: false,
    isSaving: false,
    isSubmitting: false,
    responseInstance: false,
    unsavedChanges: false,
    ignoreWarnings: true,
  };

  return { ...formData, ...customState };
}
