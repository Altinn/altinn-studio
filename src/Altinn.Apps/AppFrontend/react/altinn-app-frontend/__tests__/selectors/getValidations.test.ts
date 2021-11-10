
import 'jest';
import { makeGetComponentValidationsSelector, makeGetValidationsSelector } from '../../src/selectors/getValidations';

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
        validations: {
          mockId: {
            error: ['some error'],
            warnings: ['some warning'],
          },
          mockId_2: {
            error: ['another err'],
            warnings: ['another warning'],
          },
        },
      },
      formData: {
        unsavedChanges: false,
        formData: {
          mockDataBinding: 'value',
        },
      },
    };
    mockProps = {
      id: 'mockId',
    };
  });

  it('+++ getValidations should return validations', () => {
    const getValidations = makeGetValidationsSelector();
    const result = getValidations(initialState);
    expect(result).toEqual(initialState.formValidations.validations);
  });

  it('+++ getComponentValidations should return correct component validations', () => {
    const getComponentValidations = makeGetComponentValidationsSelector();
    const result = getComponentValidations(initialState, mockProps);
    expect(result).toEqual(initialState.formValidations.validations.mockId);
  });

});
