import 'jest';
import { IFormData } from '../../src/features/form/data/reducer';
import * as validation from '../../src/utils/validation';
import { length, max, maxLength, min, minLength, pattern } from '../../src/utils/validation';

describe('>>> utils/validations.ts', () => {
  let mockApiResponse: any;
  let mockLayout: any[];
  let mockReduxFormat: any;
  let mockLayoutState: any;
  let mockFormData: IFormData;
  let mockDataModelFields: any[];
  let mockFormValidationResult: any;

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

    mockLayout = [
      {
        type: 'Input',
        id: 'componentId_1',
        dataModelBindings: {
          simpleBinding: 'dataModelField_1',
        },
        required: true,

      },
      {
        type: 'Dropdown',
        id: 'componentId_2',
        dataModelBindings: {
          customBinding: 'dataModelField_2',
        },
      },
      {
        type: 'Paragraph',
        id: 'componentId_3',
        dataModelBindings: {
          simpleBinding: 'dataModelField_3',
        },
        required: true,
      },
    ];

    mockLayoutState = {
      layout: mockLayout,
      error: null,
    };

    mockReduxFormat = {
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

    mockFormData = {
      dataModelField_1: '-1',
      dataModelField_2: 'not long',
      dataModelField_3: '',
      random_key: 'some third value',
    };

    mockDataModelFields = [
      {
        ID: 'dataModelField_1',
        DataBindingName: 'dataModelField_1',
        Restrictions: {
          min: {
            Value: '0',
            ErrortText: 'must be bigger than 0',
          },
        },
      },
      {
        ID: 'dataModelField_2',
        DataBindingName: 'dataModelField_2',
        Restrictions: {
          minLength: {
            Value: '10',
            ErrortText: 'length must be bigger than 10',
          },
        },
      },
      {
        ID: 'dataModelField_3',
        DataBindingName: 'dataModelField_3',
        Restrictions: {},
      },
    ];

    mockFormValidationResult = {
      componentId_1: {
        simpleBinding: {
          errors: [
            'must be bigger than 0',
          ],
          warnings: [],
        },
      },
      componentId_2: {
        customBinding: {
          errors: [
            'length must be bigger than 10',
          ],
          warnings: [],
        },
      },
      componentId_3: {
        simpleBinding: {
          errors: [
            'Field is required',
          ],
          warnings: [],
        },
      },
    };
  });

  it('+++ should map api response to redux format', () => {
    const result = validation.mapApiValidationsToRedux(mockApiResponse.messages, mockLayoutState.layout);
    expect(result).toEqual(mockReduxFormat);
  });

  it('+++ should catch errors when validating the whole form data', () => {
    const result = validation.validateFormData(mockFormData, mockDataModelFields, mockLayoutState.layout);
    expect(result).toEqual(mockFormValidationResult);
  });

  it('+++ should catch errors when validating component specific form data', () => {
    const result =
      validation.validateComponentFormData(mockFormData.dataModelField_2, mockDataModelFields[1], mockLayout[1]);
    expect(result).toEqual(mockFormValidationResult.componentId_2);
  });

  it('+++ should count total number of errors correctly', () => {
    const result = validation.getErrorCount(mockFormValidationResult);
    expect(result).toEqual(3);
  });

  it('+++ validation function min should validate correctly', () => {
    const falseResult = min(10, 12);
    const trueResult = min(12, 10);
    expect(falseResult).toBeFalsy();
    expect(trueResult).toBeTruthy();
  });

  it('+++ validation function max should validate correctly', () => {
    const falseResult = max(12, 10);
    const trueResult = max(10, 12);
    expect(falseResult).toBeFalsy();
    expect(trueResult).toBeTruthy();
  });

  it('+++ validation function minLength should validate correctly', () => {
    const falseResult = minLength('hello', 12);
    const trueResult = minLength('hello', 3);
    expect(falseResult).toBeFalsy();
    expect(trueResult).toBeTruthy();
  });

  it('+++ validation function maxLength should validate correctly', () => {
    const falseResult = maxLength('hello', 3);
    const trueResult = maxLength('hello', 12);
    expect(falseResult).toBeFalsy();
    expect(trueResult).toBeTruthy();
  });

  it('+++ validation function length should validate correctly', () => {
    const falseResult = length('hello', 3);
    const trueResult = length('hello', 5);
    expect(falseResult).toBeFalsy();
    expect(trueResult).toBeTruthy();
  });

  it('+++ validation function pattern should validate correctly', () => {
    const falseResult = pattern('123', '^[a-zA-Z]+$');
    const trueResult = pattern('hello', '^[a-zA-Z]+$');
    expect(falseResult).toBeFalsy();
    expect(trueResult).toBeTruthy();
  });
});
