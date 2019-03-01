import 'jest';
import * as validation from '../../src/utils/validation';

describe('>>> utils/validations.ts', () => {
  let mockApiResponse: any;
  let mockComponents: any;
  let mockMatch: any;
  let mockLayoutState: any;

  beforeEach(() => {
    mockApiResponse = {
      messages: {
        dataModelField_1: {
          errors: ['Error message 1', 'Error message 2'],
          warnings: [],
        },
        dataModelField_2: {
          errors: [],
          warnings: ['Warning message 1', 'Warning message 2'],
        },
        random_key: {
          errors: ['test error'],
          warnings: ['test warning'],
        },
      },
    };

    mockComponents = {
      componentId_1: {
        component: 'Input',
        textResourceBindings: {
          title: 'Component 1',
        },
        dataModelBindings: {
          simpleBinding: 'dataModelField_1',
        },
      },
      componentId_2: {
        component: 'Input',
        textResourceBindings: {
          title: 'Component 2',
        },
        dataModelBindings: {
          customBinding: 'dataModelField_2',
        },
      },
    };

    mockLayoutState = {
      components: mockComponents,
      containers: {},
      order: {},
      fetching: false,
      fetched: false,
      error: null,
      saving: false,
      unSavedChanges: false,
      activeContainer: '',
      activeList: [],
    };

    mockMatch = {
      componentId_1: {
        simpleBinding: {
          errors: ['Error message 1', 'Error message 2'],
          warnings: [],
        },
      },
      componentId_2: {
        customBinding: {
          errors: [],
          warnings: ['Warning message 1', 'Warning message 2'],
        },
      },
      unmapped: {
        random_key: {
          errors: ['test error'],
          warnings: ['test warning'],
        },
      },
    };
  });

  it('+++ should map api response to redux format', () => {
    const spy = jest.spyOn(validation, 'mapApiValidationResultToLayout');
    const result = validation.mapApiValidationResultToLayout(mockApiResponse, mockLayoutState);
    expect(spy).toHaveBeenCalled();
    expect(result).toEqual(mockMatch);
  });
});
