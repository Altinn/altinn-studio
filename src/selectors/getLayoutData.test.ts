import { makeGetFocus } from 'src/selectors/getLayoutData';

describe('getLayoutData', () => {
  let initialState: any;
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
    mockPropsFocus = {
      id: 'mockId',
    };
  });

  it('getFocus should return correct focus status for layout element', () => {
    const getFocus = makeGetFocus();
    const result = getFocus(initialState, mockPropsFocus);
    expect(result).toEqual(true);
  });
});
