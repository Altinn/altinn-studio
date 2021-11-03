
import 'jest';
import { makeGetFocus, makeGetHidden } from '../../src/selectors/getLayoutData';

describe('>>> selectors/getLayoutData.test.tsx', () => {
  let initialState: any;
  let mockProps: any;
  let mockPropsFocus: any;

  beforeAll(() => {
    initialState = {
      formLayout: {
        layout: [
          {
            type: 'Input',
            id: 'mockId',
            hidden: false,
          },
          {
            type: 'FileUpload',
            id: 'mockId_2',
            hidden: false,
          },
        ],
        uiConfig: {
          focus: 'mockId',
          hiddenFields: ['mockId_2'],
        },
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
    mockPropsFocus = {
      id: 'mockId',
    };
  });

  it('+++ getHidden should return correct hidden status for layout element', () => {
    const getHidden = makeGetHidden();
    const result = getHidden(initialState, mockProps);
    expect(result).toEqual(true);
  });

  it('+++ getFocus should return correct focus status for layout element', () => {
    const getFocus = makeGetFocus();
    const result = getFocus(initialState, mockPropsFocus);
    expect(result).toEqual(true);
  });

});
