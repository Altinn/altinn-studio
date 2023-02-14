import type { IFormDataState } from 'src/features/form/data';

export function getFormDataStateMock(customState?: Partial<IFormDataState>) {
  const formData: IFormDataState = {
    error: null,
    formData: {
      'someGroup[0].labelField': 'Label for first',
      'someGroup[1].labelField': 'Label for second',
      'someGroup[0].valueField': 'Value for first',
      'someGroup[1].valueField': 'Value for second',
      'referencedGroup[0].inputField': 'Value from input field [0]',
      'referencedGroup[1].inputField': 'Value from input field [1]',
      'referencedGroup[2].inputField': 'Value from input field [2]',
    },
    lastSavedFormData: {},
    savingId: '',
    submittingId: '',
    unsavedChanges: false,
    saving: false,
    ignoreWarnings: true,
  };

  return { ...formData, ...customState };
}
