
import 'jest';
import { makeGetFormDataSelector } from '../../src/selectors/getFormData';

describe('>>> selectors/getFormData.test.tsx', () => {

  let initialState: any;
  let mockProps: any;

  beforeAll(() => {
    initialState = {
      formLayout: {
        layout: [
          { type: 'Input', id: 'mockId', hidden: false },
        ],
      },
      formDataModel: {},
      language: {
        language: {},
      },
      formResources: {
        languageResource: {
          resources: [],
        },
      },
      formValidations: {
        validations: {},
      },
      formData: {
        unsavedChanges: false,
        formData: {
          mockDataBinding: 'value',
        },
      },
    };
    mockProps = {
      dataModelBindings: {
        simpleBinding: 'mockDataBinding',
      },
    };
  });

  it('+++ getFormData should return formData', () => {
    const getFormData = makeGetFormDataSelector();
    const result = getFormData(initialState, mockProps);
    expect(result).toEqual({ mockDataBinding: 'value' });
  });

});
