/* eslint-disable no-undef */
import 'jest';
import { IFormData } from '../../src/features/form/data/formDataReducer';
import { IValidationIssue, Severity, IValidations } from '../../src/types';
import * as validation from '../../src/utils/validation';
import { getParsedLanguageFromKey } from '../../../shared/src';
import { ILayoutComponent } from '../../src/features/form/layout';

describe('>>> utils/validations.ts', () => {
  let mockApiResponse: any;
  let mockLayout: any;
  let mockReduxFormat: any;
  let mockLayoutState: any;
  let mockJsonSchema: any;
  let mockInvalidTypes: any;
  let mockFormData: IFormData;
  let mockValidFormData: IFormData;
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
        validation_errors: {
          minLength: 'length must be bigger than {0}',
          min: 'must be bigger than {0}',
          pattern: 'Feil format eller verdi',
        },
      },
    };

    mockLayout = {
      FormLayout: [
        {
          type: 'Input',
          id: 'componentId_1',
          dataModelBindings: {
            simpleBinding: 'dataModelField_1',
          },
          required: true,
          readOnly: false,
          textResourceBindings: {},

        },
        {
          type: 'Input',
          id: 'componentId_2',
          dataModelBindings: {
            customBinding: 'dataModelField_2',
          },
          required: true,
          readOnly: false,
          textResourceBindings: {},
        },
        {
          type: 'TextArea',
          id: 'componentId_3',
          dataModelBindings: {
            simpleBinding: 'dataModelField_3',
          },
          required: true,
          readOnly: false,
          textResourceBindings: {},
        },
        {
          type: 'group',
          id: 'group1',
          dataModelBindings: {
            simpleBinding: 'group_1',
          },
          maxCount: 3,
          children: [
            'componentId_4',
          ],
        },
        {
          type: 'Input',
          id: 'componentId_4',
          dataModelBindings: {
            simpleBinding: 'group_1.dataModelField_4',
          },
          required: false,
          readOnly: false,
          textResourceBindings: {},
        },
        {
          type: 'FileUpload',
          id: 'componentId_4',
          dataModelBindings: {},
          maxNumberOfAttachments: '3',
          minNumberOfAttachments: '2',
        },
      ],
    };

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
      layouts: mockLayout,
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
      group_1: [
        { dataModelField_4: 'Hello...' },
      ],
    };

    mockValidFormData = {
      dataModelField_1: '12',
      dataModelField_2: 'Really quite long...',
      dataModelField_3: 'Test 123',
      group_1: [
        { dataModelField_4: 'Hello, World!' },
        { dataModelField_4: 'Not now!' },
      ],
    };

    mockJsonSchema = {
      $id: 'schema',
      properties: {
        root: {
          $ref: '#/definitions/TestDataModel',
        },
      },
      definitions: {
        TestDataModel: {
          properties: {
            dataModelField_1: {
              type: 'number',
              minimum: 0,
            },
            dataModelField_2: {
              type: 'string',
              minLength: 10,
            },
            dataModelField_3: {
              type: 'string',
            },
            group_1: {
              type: 'array',
              minItems: 1,
              maxItems: 3,
              items: {
                $ref: '#/definitions/Group1',
              },
            },
          },
          required: [
            'dataModelField_1',
            'dataModelField_2',
            'dataModelField_3',
          ],
        },
        Group1: {
          properties: {
            dataModelField_4: {
              type: 'string',
              pattern: '^Hello, World!|Cool stuff...|Not now!$',
            },
          },
        },
      },
    };

    mockFormValidationResult = {
      validations: {
        componentId_1: {
          simpleBinding: {
            errors: [
              getParsedLanguageFromKey('validation_errors.min', mockLanguage.language, [0]),
            ],
          },
        },
        componentId_2: {
          customBinding: {
            errors: [
              getParsedLanguageFromKey('validation_errors.minLength', mockLanguage.language, [10]),
            ],
          },
        },
        'componentId_4-0': {
          simpleBinding: {
            errors: [
              getParsedLanguageFromKey('validation_errors.pattern', mockLanguage.language),
            ],
          },
        },
      },
      invalidDataTypes: false,
    };

    mockInvalidTypes = {
      validations: {},
      invalidDataTypes: true,
    };

    mockDataElementValidations = [
      // tslint:disable max-line-length
      {
        field: 'dataModelField_1',
        severity: Severity.Error,
        scope: null,
        targetId: '',
        description: 'Error message 1',
        code: '',
      },
      {
        field: 'dataModelField_1',
        severity: Severity.Error,
        scope: null,
        targetId: '',
        description: 'Error message 2',
        code: '',
      },
      {
        field: 'dataModelField_2',
        severity: Severity.Warning,
        scope: null,
        targetId: '',
        description: 'Warning message 1',
        code: '',
      },
      {
        field: 'dataModelField_2',
        severity: Severity.Warning,
        scope: null,
        targetId: '',
        description: 'Warning message 2',
        code: '',
      },
      {
        field: 'random_key',
        severity: Severity.Warning,
        scope: null,
        targetId: '',
        description: 'test warning',
        code: '',
      },
      {
        field: 'random_key',
        severity: Severity.Error,
        scope: null,
        targetId: '',
        description: 'test error',
        code: '',
      },
    ];
  });

  it('+++ should map api response to redux format', () => {
    const result = validation.mapApiValidationsToRedux(mockApiResponse.messages, mockLayoutState.layouts.FormLayout);
    expect(result).toEqual(mockReduxFormat);
  });

  it('+++ should count total number of errors correctly', () => {
    const result = validation.getErrorCount(mockFormValidationResult.validations);
    expect(result).toEqual(3);
  });

  it('+++ canFormBeSaved should validate correctly', () => {
    const apiModeComplete = 'Complete';
    const falseResult = validation.canFormBeSaved(mockFormValidationResult, apiModeComplete);
    const falseResult2 = validation.canFormBeSaved(mockInvalidTypes);
    const trueResult2 = validation.canFormBeSaved(null);
    const trueResult3 = validation.canFormBeSaved(mockFormValidationResult);
    expect(falseResult).toBeFalsy();
    expect(falseResult2).toBeFalsy();
    expect(trueResult2).toBeTruthy();
    expect(trueResult3).toBeTruthy();
  });

  it('+++ validateFormComponents should return error on fileUpload if its not enough files', () => {
    const componentSpesificValidations =
      validation.validateFormComponents(
        mockFormAttachments.attachments,
        mockLayoutState.layouts,
        mockFormData,
        mockLanguage.language,
        [],
      );

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
    const componentSpesificValidations = validation.validateFormComponents(
      mockFormAttachments.attachments,
      mockLayoutState.layouts,
      mockFormData,
      mockLanguage.language,
      [],
    );

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
    mockLayout = {
      FormLayout: [
        {
          type: 'FileUpload',
          id: 'componentId_4',
          dataModelBindings: {},
          maxNumberOfAttachments: '1',
          minNumberOfAttachments: '0',
        },
      ],
    };
    const componentSpesificValidations =
      validation.validateFormComponents(
        mockFormAttachments.attachments,
        mockLayout,
        mockFormData,
        mockLanguage.language,
        [],
      );

    const mockResult = {};

    expect(componentSpesificValidations).toEqual(mockResult);
  });

  it('+++ validateFormComponents should not return error if element is hidden', () => {
    mockLayout = {
      FormLayout: [
        {
          type: 'FileUpload',
          id: 'componentId_4',
          dataModelBindings: {},
          maxNumberOfAttachments: '1',
          minNumberOfAttachments: '0',
        },
      ],
    };
    const componentSpesificValidations =
      validation.validateFormComponents(mockFormAttachments.attachments, mockLayout, mockFormData, mockLanguage.language, ['componentId_4']);

    const mockResult = {};

    expect(componentSpesificValidations).toEqual(mockResult);
  });

  it('+++ validateEmptyFields should return error if empty fields are required', () => {
    const repeatingGroups = {
      group1: {
        count: 0,
      },
    };
    const componentSpesificValidations =
      validation.validateEmptyFields(
        mockFormData,
        mockLayout,
        mockLanguage.language,
        [],
        repeatingGroups,
      );

    const mockResult = { componentId_3: { simpleBinding: { errors: ['Feltet er påkrevd'], warnings: [] } } };

    expect(componentSpesificValidations).toEqual(mockResult);
  });

  it('+++ validateEmptyField should add error to validations if supplied field is required', () => {
    const validations = {};
    const component = mockLayout.FormLayout.find((c) => c.id === 'componentId_3');
    validation.validateEmptyField(
      mockFormData,
      component,
      validations,
      mockLanguage.language,
    );

    const mockResult = { componentId_3: { simpleBinding: { errors: ['Feltet er påkrevd'], warnings: [] } } };

    expect(validations).toEqual(mockResult);
  });

  it('+++ data element validations should be mapped correctly to our redux format', () => {
    const mappedDataElementValidaitons =
      validation.mapDataElementValidationToRedux(mockDataElementValidations, mockLayoutState.layouts, []);
    expect(mappedDataElementValidaitons).toEqual(mockReduxFormat);
  });

  it('+++ validateFormData should return error if form data is invalid', () => {
    const mockValidator = validation.createValidator(mockJsonSchema);
    const mockResult = validation.validateFormData(
      mockFormData,
      mockLayoutState.layouts,
      mockValidator,
      mockLanguage.language,
    );
    expect(mockResult).toEqual(mockFormValidationResult);
  });

  it('+++ validateFormData should return no errors if form data is valid', () => {
    const mockValidator = validation.createValidator(mockJsonSchema);
    const mockResult = validation.validateFormData(
      mockValidFormData,
      mockLayoutState.layouts,
      mockValidator,
      mockLanguage,
    );
    expect(mockResult.validations).toEqual({});
  });

  it('+++ validateFormData should return invalidDataTypes=true if form data is wrong type', () => {
    const data: any = {
      dataModelField_1: 'abc',
    };
    const mockValidator = validation.createValidator(mockJsonSchema);
    const mockResult = validation.validateFormData(data, mockLayoutState.layouts, mockValidator, mockLanguage);
    expect(mockResult.invalidDataTypes).toBeTruthy();
  });

  it('+++ getIndex should return null for field not in repeating group', () => {
    const dataModelBinding = 'dataModelField_1';
    expect(validation.getIndex(dataModelBinding)).toBeNull();
  });

  it('+++ getIndex should return index for field in repeating group', () => {
    const dataModelBinding = 'group_1[2].dataModelField_1';
    expect(validation.getIndex(dataModelBinding)).toBe('2');
  });

  it('+++ componentHasValidations should return true if component has validations', () => {
    const validations: IValidations = {
      dummyId: {
        simpleBinding: {
          errors: ['Some error'],
        },
      },
    };
    expect(validation.componentHasValidations(validations, 'dummyId')).toBeTruthy();
  });

  it('+++ componentHasValidations should return false if component has no validations', () => {
    const validations: IValidations = {
      dummyId: {
        simpleBinding: {
          errors: ['Some error'],
        },
      },
    };
    expect(validation.componentHasValidations(validations, 'someOtherId')).toBeFalsy();
  });

  it('+++ componentHasValidations should return false when supplied with null values', () => {
    expect(validation.componentHasValidations(null, null)).toBeFalsy();
  });

  it('+++ repeatingGroupHasValidations should return true when components in group has errors', () => {
    const children: ILayoutComponent[] = [
      { id: 'some-id' } as ILayoutComponent,
      { id: 'some-other-id' } as ILayoutComponent,
    ];
    const validations: IValidations = {
      'some-id-2': {
        simpleBinding: {
          errors: ['Some error'],
        },
      },
    };
    expect(validation.repeatingGroupHasValidations(validations, 2, children)).toBeFalsy();
  });

  it('+++ repeatingGroupHasValidations should return false when no components in group has errors', () => {
    const children: ILayoutComponent[] = [
      { id: 'some-id' } as ILayoutComponent,
      { id: 'some-other-id' } as ILayoutComponent,
    ];
    const validations: IValidations = {
      differentId: {
        simpleBinding: {
          errors: ['Some error'],
        },
      },
    };
    expect(validation.repeatingGroupHasValidations(validations, 2, children)).toBeFalsy();
  });

  it('+++ repeatingGroupHasValidations should return false when supplied with null values', () => {
    expect(validation.repeatingGroupHasValidations(null, null, null)).toBeFalsy();
  });
});
