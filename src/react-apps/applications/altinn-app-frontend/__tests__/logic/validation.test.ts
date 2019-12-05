import 'jest';
import { IFormData } from '../../src/features/form/data/reducer';
import { IValidationIssue, Severity } from '../../src/types';
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
  let mockLanguage: any;
  let mockFormAttachments: any;
  let mockDataElementValidations: IValidationIssue[];

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

    mockLanguage = {
      language: {
        form_filler: {
          error_required: 'Feltet er påkrevd',
          file_uploader_validation_error_file_number_1: 'For å fortsette må du laste opp',
          file_uploader_validation_error_file_number_2: 'vedlegg',
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
      {
        type: 'FileUpload',
        id: 'componentId_4',
        dataModelBindings: {},
        maxNumberOfAttachments: '3',
        minNumberOfAttachments: '2',
      },
    ];

    mockFormAttachments = {
      attachments: {
        componentId_4: [
          {
            name: 'test.png', size: 75375, uploaded: true, id: '77a34540-b670-4ede-9379-43df4aaf18b9', deleting: false,
          },
        ],
      },
    };

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
        id: 'dataModelField_1',
        dataBindingName: 'dataModelField_1',
        restrictions: {
          min: {
            Value: '0',
            ErrortText: 'must be bigger than 0',
          },
        },
      },
      {
        id: 'dataModelField_2',
        dataBindingName: 'dataModelField_2',
        restrictions: {
          minLength: {
            Value: '10',
            ErrortText: 'length must be bigger than 10',
          },
        },
      },
      {
        id: 'dataModelField_3',
        dataBindingName: 'dataModelField_3',
        restrictions: {},
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
            'Feltet er påkrevd',
          ],
          warnings: [],
        },
      },
    };
    mockDataElementValidations = [
      // tslint:disable max-line-length
      {field: 'dataModelField_1', severity: Severity.Error, scope: null, targetId: '', description: 'Error message 1', code: ''},
      {field: 'dataModelField_1', severity: Severity.Error, scope: null, targetId: '', description: 'Error message 2', code: ''},
      {field: 'dataModelField_2', severity: Severity.Warning, scope: null, targetId: '', description: 'Warning message 1', code: ''},
      {field: 'dataModelField_2', severity: Severity.Warning, scope: null, targetId: '', description: 'Warning message 2', code: ''},
      {field: 'random_key', severity: Severity.Warning, scope: null, targetId: '', description: 'test warning', code: ''},
      {field: 'random_key', severity: Severity.Error, scope: null, targetId: '', description: 'test error', code: ''},
    ];
  });

  it('+++ should map api response to redux format', () => {
    const result = validation.mapApiValidationsToRedux(mockApiResponse.messages, mockLayoutState.layout);
    expect(result).toEqual(mockReduxFormat);
  });

  // it('+++ should catch errors when validating the whole form data', () => {
  //   const result = validation.validateFormData(mockFormData, mockDataModelFields, mockLayoutState.layout,
  //     mockLanguage.language);
  //   expect(result).toEqual(mockFormValidationResult);
  // });

  // it('+++ should catch errors when validating component specific form data', () => {
  //   const result =
  //     validation.validateComponentFormData(mockFormData.dataModelField_2, mockDataModelFields[1], mockLayout[1],
  //       mockLanguage.language);
  //   expect(result).toEqual(mockFormValidationResult.componentId_2);
  // });

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

  it('+++ canFormBeSaved should validate correctly', () => {
    const validValidationResult = {
      componentId_1: {
        simpleBinding: {
          errors: [
            'Field is required',
          ],
          warnings: [],
        },
      },
      componentId_2: {
        customBinding: {
          errors: [],
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
    const falseResult = validation.canFormBeSaved(mockFormValidationResult);
    const trueResult = validation.canFormBeSaved(validValidationResult);
    const trueResult2 = validation.canFormBeSaved(null);
    expect(falseResult).toBeFalsy();
    expect(trueResult).toBeTruthy();
    expect(trueResult2).toBeTruthy();
  });
  it('+++ validateFormComponents should return error on fileUpload if its not enough files', () => {
    const componentSpesificValidations =
      validation.validateFormComponents(mockFormAttachments.attachments, mockLayoutState.layout, mockLanguage.language);

    const mockResult = {
      componentId_4: {
        simpleBinding: {
          errors: ['For å fortsette må du laste opp 2 vedlegg'],
          warnings: [],
        },
      },
    };

    expect(componentSpesificValidations).toEqual(mockResult);
  });
  it('+++ validateFormComponents should return error on fileUpload if its no file', () => {
    mockFormAttachments = {
      attachments: null,
    };
    const componentSpesificValidations =
      validation.validateFormComponents(mockFormAttachments.attachments, mockLayoutState.layout, mockLanguage.language);

    const mockResult = {
      componentId_4: {
        simpleBinding: {
          errors: ['For å fortsette må du laste opp 2 vedlegg'],
          warnings: [],
        },
      },
    };

    expect(componentSpesificValidations).toEqual(mockResult);
  });
  it('+++ validateFormComponents should not return error on fileUpload if its enough files', () => {
    mockLayout = [
      {
        type: 'FileUpload',
        id: 'componentId_4',
        dataModelBindings: {},
        maxNumberOfAttachments: '1',
        minNumberOfAttachments: '0',
      },
    ];
    const componentSpesificValidations =
      validation.validateFormComponents(mockFormAttachments.attachments, mockLayout, mockLanguage.language);

    const mockResult = {};

    expect(componentSpesificValidations).toEqual(mockResult);
  });
  it('+++ validateFormComponents should not return error if element is hidden', () => {
    mockLayout = [
      {
        type: 'FileUpload',
        id: 'componentId_4',
        dataModelBindings: {},
        maxNumberOfAttachments: '1',
        minNumberOfAttachments: '0',
        hidden: true,
      },
    ];
    const componentSpesificValidations =
      validation.validateFormComponents(mockFormAttachments.attachments, mockLayout, mockLanguage.language);

    const mockResult = {};

    expect(componentSpesificValidations).toEqual(mockResult);
  });
  it('+++ validateEmptyFields should return error if empty fields are required', () => {

    const componentSpesificValidations =
      validation.validateEmptyFields(mockFormData, mockLayout, mockLanguage.language);

    const mockResult = { componentId_3: { simpleBinding: { errors: ['Feltet er påkrevd'], warnings: [] } } };

    expect(componentSpesificValidations).toEqual(mockResult);
  });
  it('+++ data element validations should be mapped correctly to our redux format', () => {
    const mappedDataElementValidaitons = validation.mapDataElementValidationToRedux(mockDataElementValidations, mockLayoutState.layout);
    expect(mappedDataElementValidaitons).toEqual(mockReduxFormat);
  });
});
