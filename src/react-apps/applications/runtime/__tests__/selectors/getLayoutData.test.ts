/* tslint:disable:jsx-wrap-multiline */
import 'jest';
import { makeGetLayout, makeGetLayoutElement } from '../../src/selectors/getLayoutData';

describe('>>> selectors/getLayoutData.test.tsx', () => {

  let initialState: any;
  let mockProps: any;

  beforeAll(() => {
    initialState = {
      formLayout: {
        layout: [
          { type: 'Input', id: 'mockId', hidden: false },
          { type: 'FileUpload', id: 'mockId_2', hidden: false },
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
      id: 'mockId_2',
    };
  });

  it('+++ getLayout should return formLayout', () => {
    const getLayout = makeGetLayout();
    const result = getLayout(initialState);
    expect(result).toEqual(initialState.formLayout.layout);
  });

  it('+++ getLayoutElement should return correct layout element', () => {
    const getLayoutElement = makeGetLayoutElement();
    const result = getLayoutElement(initialState, mockProps);
    expect(result).toEqual(initialState.formLayout.layout[1]);
  });

});
