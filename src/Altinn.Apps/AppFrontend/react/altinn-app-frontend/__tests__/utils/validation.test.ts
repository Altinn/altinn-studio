/* eslint-disable max-len */
/* eslint-disable no-undef */
import 'jest';
import { IFormData } from '../../src/features/form/data/formDataReducer';
import { IValidationIssue, Severity, IValidations, IRepeatingGroups, IRuntimeState, IComponentBindingValidation, IComponentValidations } from '../../src/types';
import * as validation from '../../src/utils/validation';
import { getParsedLanguageFromKey } from '../../../shared/src';
import { ILayoutComponent, ILayoutGroup } from '../../src/features/form/layout';
import { createRepeatingGroupComponents } from '../../src/utils/formLayout';
import { mapToComponentValidations } from '../../src/utils/validation';
import { getParsedTextResourceByKey } from '../../src/utils/textResource';
import { getInitialStateMock } from '../../__mocks__/initialStateMock';
import { getMockValidationState } from '../../__mocks__/validationStateMock';
import * as oneOfOnRootSchema from '../../__mocks__/json-schema/one-of-on-root.json';
import * as refOnRootSchema from '../../__mocks__/json-schema/ref-on-root.json';
import * as complexSchema from '../../__mocks__/json-schema/complex.json';

describe('utils > validation', () => {
  let mockLayout: any;
  let mockReduxFormat: any;
  let mockLayoutState: any;
  let mockJsonSchema: any;
  let mockInvalidTypes: any;
  let mockFormData: any;
  let mockValidFormData: any;
  let mockFormValidationResult: any;
  let mockLanguage: any;
  let mockFormAttachments: any;
  let mockDataElementValidations: IValidationIssue[];

  beforeEach(() => {
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
            group: 'group_1',
          },
          maxCount: 3,
          children: [
            'componentId_4',
            'group2',
          ],
        },
        {
          type: 'group',
          id: 'group2',
          dataModelBindings: {
            group: 'group_1.group_2',
          },
          maxCount: 3,
          children: [
            'componentId_5',
          ],
        },
        {
          type: 'Input',
          id: 'componentId_4',
          dataModelBindings: {
            simpleBinding: 'group_1.dataModelField_4',
          },
          required: true,
          readOnly: false,
          textResourceBindings: {},
        },
        {
          type: 'FileUpload',
          id: 'componentId_7',
          dataModelBindings: {},
          maxNumberOfAttachments: '3',
          minNumberOfAttachments: '2',
        },
        {
          type: 'Input',
          id: 'componentId_5',
          dataModelBindings: {
            simpleBinding: 'group_1.group_2.dataModelField_5',
          },
          required: false,
          readOnly: false,
          textResourceBindings: {},
        },
        {
          type: 'AddressComponent',
          id: 'componentId_6',
          dataModelBindings: {
            address: 'address.StreetName',
            zipCode: 'address.PostCode',
            postPlace: 'address.PostPlacee',
          },
          required: true,
          readOnly: false,
          textResourceBindings: {},
        },
        {
          type: 'Input',
          id: 'componentId_customError',
          dataModelBindings: {
            simpleBinding: 'dataModelField_custom',
          },
          required: false,
          readOnly: false,
          textResourceBindings: {},
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

    mockReduxFormat = getMockValidationState();

    mockFormData = {
      dataModelField_1: '-1',
      dataModelField_2: 'not long',
      dataModelField_3: '',
      random_key: 'some third value',
      group_1: [
        { dataModelField_4: 'Hello...', group_2: [{ dataModelField_5: 'This does not trigger validation' }, { dataModelField_5: 'Does.' }] },
      ],
    };

    mockValidFormData = {
      dataModelField_1: '12',
      dataModelField_2: 'Really quite long...',
      dataModelField_3: 'Test 123',
      dataModelField_custom: 'abc',
      group_1: [
        { dataModelField_4: 'Hello, World!', group_2: [{ dataModelField_5: 'This is long' }, { dataModelField_5: 'This is also long' }] },
        { dataModelField_4: 'Not now!', group_2: [{ dataModelField_5: 'This is long' }, { dataModelField_5: 'Something else that is long' }] },
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
            dataModelField_custom: {
              type: 'string',
              maxLength: 4,
              errorMessage: 'custom_error',
            },
            group_1: {
              type: 'array',
              minItems: 1,
              maxItems: 3,
              items: {
                $ref: '#/definitions/Group1',
              },
            },
            address: {
              $ref: '#/definitions/Address',
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
            group_2: {
              type: 'array',
              minItems: 1,
              maxItems: 3,
              items: {
                $ref: '#/definitions/Group2',
              },
            },
          },
        },
        Group2: {
          properties: {
            dataModelField_5: {
              type: 'string',
              minLength: 10,
            },
          },
        },
        Address: {
          properties: {
            StreetName: {
              type: 'string',
            },
            PostCode: {
              type: 'string',
            },
            PostPlace: {
              type: 'string',
            },
          },
        },
      },
    };

    mockFormValidationResult = {
      validations: {
        FormLayout: {
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
          'componentId_5-0-1': {
            simpleBinding: {
              errors: [
                getParsedLanguageFromKey('validation_errors.minLength', mockLanguage.language, [10]),
              ],
            },
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
      {
        field: 'group_1[1].dataModelField_4',
        severity: Severity.Error,
        scope: null,
        targetId: '',
        description: 'test error',
        code: '',
      },
      {
        field: 'group_1[0].group_2[1].dataModelField_5',
        severity: Severity.Error,
        scope: null,
        targetId: '',
        description: 'test error',
        code: '',
      },
    ];
  });

  it('+++ should count total number of errors correctly', () => {
    const result = validation.getErrorCount(mockFormValidationResult.validations);
    expect(result).toEqual(4);
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
        Object.keys(mockLayoutState.layouts),
        mockFormData,
        mockLanguage.language,
        [],
      );

    const mockResult = {
      FormLayout: {
        componentId_7: {
          simpleBinding: {
            errors: ['For å fortsette må du laste opp 2 vedlegg'],
            warnings: [],
          },
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
      Object.keys(mockLayoutState.layouts),
      mockFormData,
      mockLanguage.language,
      [],
    );

    const mockResult = {
      FormLayout: {
        componentId_7: {
          simpleBinding: {
            errors: ['For å fortsette må du laste opp 2 vedlegg'],
            warnings: [],
          },
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
        Object.keys(mockLayout),
        mockFormData,
        mockLanguage.language,
        [],
      );

    const mockResult = {
      FormLayout: {},
    };

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
      validation.validateFormComponents(mockFormAttachments.attachments, mockLayout, Object.keys(mockLayout), mockFormData, mockLanguage.language, ['componentId_4']);

    const mockResult = {
      FormLayout: {},
    };

    expect(componentSpesificValidations).toEqual(mockResult);
  });

  it('+++ validateFormComponents should not return error if element is part of layout not present in layoutOrder (sporvalg)', () => {
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
      validation.validateFormComponents(mockFormAttachments.attachments, mockLayout, [], mockFormData, mockLanguage.language, []);

    expect(componentSpesificValidations).toEqual({});
  });

  it('+++ validateEmptyFields should return error if empty fields are required', () => {
    const repeatingGroups = {
      group1: {
        count: 0,
        editIndex: -1,
      },
    };
    const componentSpesificValidations =
      validation.validateEmptyFields(
        mockFormData,
        mockLayout,
        Object.keys(mockLayout),
        mockLanguage.language,
        [],
        repeatingGroups,
      );

    const mockResult = {
      FormLayout: {
        componentId_3: { simpleBinding: { errors: ['Feltet er påkrevd'], warnings: [] } },
        'componentId_4-0': { simpleBinding: { errors: ['Feltet er påkrevd'], warnings: [] } },
        componentId_6: {
          address: { errors: ['Feltet er påkrevd'], warnings: [] }, postPlace: { errors: ['Feltet er påkrevd'], warnings: [] }, zipCode: { errors: ['Feltet er påkrevd'], warnings: [] },
        },
      },
    };

    expect(componentSpesificValidations).toEqual(mockResult);
  });

  it('+++ validateEmptyFields should not return error for repeating group if child is hidden', () => {
    const repeatingGroups = {
      group1: {
        count: 0,
        editIndex: -1,
      },
    };
    const componentSpesificValidations =
      validation.validateEmptyFields(
        mockFormData,
        mockLayout,
        Object.keys(mockLayout),
        mockLanguage.language,
        ['componentId_4-0'],
        repeatingGroups,
      );

    const mockResult = {
      FormLayout: {
        componentId_3: { simpleBinding: { errors: ['Feltet er påkrevd'], warnings: [] } },
        componentId_6: {
          address: { errors: ['Feltet er påkrevd'], warnings: [] }, postPlace: { errors: ['Feltet er påkrevd'], warnings: [] }, zipCode: { errors: ['Feltet er påkrevd'], warnings: [] },
        },
      },
    };

    expect(componentSpesificValidations).toEqual(mockResult);
  });

  it('+++ validateEmptyFields should not return error if component is not part of layout order (sporvalg)', () => {
    const repeatingGroups = {
      group1: {
        count: 0,
        editIndex: -1,
      },
    };
    const componentSpesificValidations =
      validation.validateEmptyFields(
        mockFormData,
        mockLayout,
        [],
        mockLanguage.language,
        [],
        repeatingGroups,
      );

    expect(componentSpesificValidations).toEqual({});
  });

  it('+++ validateEmptyField should add error to validations if supplied field is required', () => {
    const component = mockLayout.FormLayout.find((c) => c.id === 'componentId_3');
    const validations = {};
    validations[component.id] = validation.validateEmptyField(
      mockFormData,
      component.dataModelBindings,
      mockLanguage.language,
    );

    const mockResult = { componentId_3: { simpleBinding: { errors: ['Feltet er påkrevd'], warnings: [] } } };

    expect(validations).toEqual(mockResult);
  });

  it('+++ validateEmptyField should find all errors in an AddressComponent', () => {
    const component = mockLayout.FormLayout.find((c) => c.id === 'componentId_6');
    const validations = {};
    validations[component.id] = validation.validateEmptyField(
      mockFormData,
      component.dataModelBindings,
      mockLanguage.language,
    );

    const mockResult = {
      componentId_6: {
        address: { errors: ['Feltet er påkrevd'], warnings: [] }, postPlace: { errors: ['Feltet er påkrevd'], warnings: [] }, zipCode: { errors: ['Feltet er påkrevd'], warnings: [] },
      },
    };

    expect(validations).toEqual(mockResult);
  });

  it('+++ data element validations should be mapped correctly to our redux format', () => {
    const mappedDataElementValidations =
      validation.mapDataElementValidationToRedux(mockDataElementValidations, mockLayoutState.layouts, []);
    const expected = getMockValidationState(true);
    expect(mappedDataElementValidations).toEqual(expected);
  });

  it('+++ validateFormData should return error if form data is invalid', () => {
    const mockValidator = validation.createValidator(mockJsonSchema);
    const mockResult = validation.validateFormData(
      mockFormData,
      mockLayoutState.layouts,
      Object.keys(mockLayoutState.layouts),
      mockValidator,
      mockLanguage.language,
      [],
    );
    expect(mockResult).toEqual(mockFormValidationResult);
  });

  it('+++ validateFormData should return no errors if form data is valid', () => {
    const mockValidator = validation.createValidator(mockJsonSchema);
    const mockResult = validation.validateFormData(
      mockValidFormData,
      mockLayoutState.layouts,
      Object.keys(mockLayoutState.layouts),
      mockValidator,
      mockLanguage,
      [],
    );
    expect(mockResult.validations).toEqual({});
  });

  it('+++ validateFormData should return custom error message when this is defined', () => {
    const mockValidator = validation.createValidator(mockJsonSchema);
    const mockTexts = [{ id: 'custom_error', value: 'This is a custom error message' }];
    const formData = {
      ...mockValidFormData,
      dataModelField_custom: 'abcdefg',
    };

    const mockResult = validation.validateFormData(
      formData,
      mockLayoutState.layouts,
      Object.keys(mockLayoutState.layouts),
      mockValidator,
      mockLanguage,
      mockTexts,
    );
    expect(mockResult.validations).toEqual({
      FormLayout: {
        componentId_customError: {
          simpleBinding: {
            errors: [getParsedTextResourceByKey('custom_error', mockTexts)],
          },
        },
      },
    });
  });

  it('+++ validateFormData should return invalidDataTypes=true if form data is wrong type', () => {
    const data: any = {
      dataModelField_1: 'abc',
    };
    const mockValidator = validation.createValidator(mockJsonSchema);
    const mockResult = validation.validateFormData(
      data,
      mockLayoutState.layouts,
      Object.keys(mockLayoutState.layouts),
      mockValidator,
      mockLanguage,
      [],
    );
    expect(mockResult.invalidDataTypes).toBeTruthy();
  });

  it('+++ validateFormData should not return error if form data is part of layout not present in layoutOrder (sporvalg)', () => {
    const mockValidator = validation.createValidator(mockJsonSchema);
    const mockResult = validation.validateFormData(
      mockFormData,
      mockLayoutState.layouts,
      [],
      mockValidator,
      mockLanguage.language,
      [],
    );
    expect(mockResult).toEqual({ invalidDataTypes: false, validations: {} });
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
      FormLayout: {
        dummyId: {
          simpleBinding: {
            errors: ['Some error'],
          },
        },
      },
    };
    expect(validation.componentHasValidations(validations, 'FormLayout', 'dummyId')).toBeTruthy();
  });

  it('+++ componentHasValidations should return false if component has no validations', () => {
    const validations: IValidations = {
      FormLayout: {
        dummyId: {
          simpleBinding: {
            errors: ['Some error'],
          },
        },
      },
    };
    expect(validation.componentHasValidations(validations, 'FormLayout', 'someOtherId')).toBeFalsy();
  });

  it('+++ componentHasValidations should return false when supplied with null values', () => {
    expect(validation.componentHasValidations(null, null, null)).toBeFalsy();
  });

  it('+++ repeatingGroupHasValidations should return true when components in group has errors', () => {
    const group = {
      id: 'group',
      type: 'Group',
      dataModelBindings: { group: 'group' },
      children: ['child1', 'child2'],
    } as unknown as ILayoutGroup;

    const validations: IValidations = {
      FormLayout: {
        'child1-0': {
          simpleBinding: {
            errors: ['some error'],
          },
        },
      },
    };

    const repeatingGroups: IRepeatingGroups = {
      group: {
        count: 0,
        editIndex: -1,
      },
    };

    const layout = [
      {
        id: 'group',
        type: 'Group',
        dataModelBindings: { group: 'group' },
        children: ['child1', 'child2'],
      } as unknown as ILayoutGroup,
      {
        id: 'child1',
        type: 'Input',
        dataModelBindings: { simpleBinding: 'group.child1' },
      } as unknown as ILayoutComponent,
      {
        id: 'child2',
        type: 'Input',
        dataModelBindings: { simpleBinding: 'group.child2' },
      } as unknown as ILayoutComponent,
    ];

    // this parsing is handled internally in GroupContainer. Is done manually here to test util function
    const groupChildren = createRepeatingGroupComponents(group, layout.filter((element) => group.children.includes(element.id)), 0, []);
    expect(validation.repeatingGroupHasValidations(group, groupChildren, validations, 'FormLayout', repeatingGroups, layout)).toBeTruthy();
  });

  it('+++ repeatingGroupHasValidations should return true when a child group has validations', () => {
    const group = {
      id: 'group',
      type: 'Group',
      dataModelBindings: { group: 'group' },
      children: ['child1', 'group2'],
    } as unknown as ILayoutGroup;

    const validations: IValidations = {
      FormLayout: {
        'child2-0-0': {
          simpleBinding: {
            errors: ['some error'],
          },
        },
      },
    };

    const repeatingGroups: IRepeatingGroups = {
      group: {
        count: 0,
        editIndex: -1,
      },
      'group2-0': {
        count: 0,
        editIndex: -1,
      },
    };

    const layout = [
      {
        id: 'group',
        type: 'Group',
        dataModelBindings: { group: 'group' },
        children: ['child1', 'group2'],
      } as unknown as ILayoutGroup,
      {
        id: 'child1',
        type: 'Input',
        dataModelBindings: { simpleBinding: 'group.child1' },
      } as unknown as ILayoutComponent,
      {
        id: 'group2',
        type: 'Group',
        dataModelBindings: { group: 'group.group2' },
        children: ['child2'],
      } as unknown as ILayoutComponent,
      {
        id: 'child2',
        type: 'Input',
        dataModelBindings: { simpleBinding: 'group.group2.child2' },
      } as unknown as ILayoutComponent,
    ];
    const groupChildren = createRepeatingGroupComponents(group, layout.filter((element) => group.children.includes(element.id)), 0, []);
    expect(validation.repeatingGroupHasValidations(group, groupChildren, validations, 'FormLayout', repeatingGroups, layout)).toBeTruthy();
  });

  it('+++ repeatingGroupHasValidations should return false when no children has validations', () => {
    const group = {
      id: 'group',
      type: 'Group',
      dataModelBindings: { group: 'group' },
      children: ['child1'],
    } as unknown as ILayoutGroup;

    const validations: IValidations = {
      FormLayout: {
        'some-random-field': {
          simpleBinding: {
            errors: ['some error'],
          },
        },
      },
    };

    const repeatingGroups: IRepeatingGroups = {
      group: {
        count: 0,
        editIndex: -1,
      },
    };

    const layout = [
      {
        id: 'group',
        type: 'Group',
        dataModelBindings: { group: 'group' },
        children: ['child1', 'child2'],
      } as unknown as ILayoutGroup,
      {
        id: 'child1',
        type: 'Input',
        dataModelBindings: { simpleBinding: 'group.child1' },
      } as unknown as ILayoutComponent,
    ];

    const groupChildren = createRepeatingGroupComponents(group, layout.filter((element) => group.children.includes(element.id)), 0, []);
    expect(validation.repeatingGroupHasValidations(group, groupChildren, validations, 'FormLayout', repeatingGroups, layout)).toBeFalsy();
  });

  it('+++ repeatingGroupHasValidations should return false when supplied with null values', () => {
    expect(validation.repeatingGroupHasValidations(null, null, null, null, null, null)).toBeFalsy();
  });

  it('+++ mapToComponentValidations should map validation to correct component', () => {
    const validations = {};
    mapToComponentValidations('FormLayout', mockLayout.FormLayout, 'dataModelField_2', 'some error', validations);
    const expectedResult = {
      FormLayout: {
        componentId_2: {
          customBinding: {
            errors: ['some error'],
          },
        },
      },
    };
    expect(validations).toEqual(expectedResult);
  });

  it('+++ mapToComponentValidations should map validation to correct component for component in a repeating group', () => {
    const validations = {};
    mapToComponentValidations('FormLayout', mockLayout.FormLayout, 'group_1[0].dataModelField_4', 'some error', validations);
    const expectedResult = {
      FormLayout: {
        'componentId_4-0': {
          simpleBinding: {
            errors: ['some error'],
          },
        },
      },
    };
    expect(validations).toEqual(expectedResult);
  });

  it('+++ mapToComponentValidations should map validation to correct component for component in a nested repeating group', () => {
    const validations = {};
    mapToComponentValidations('FormLayout', mockLayout.FormLayout, 'group_1[0].group_2[0].dataModelField_5', 'some error', validations);
    const expectedResult = {
      FormLayout: {
        'componentId_5-0-0': {
          simpleBinding: {
            errors: ['some error'],
          },
        },
      },
    };
    expect(validations).toEqual(expectedResult);
  });


  describe('hasValidationsOfSeverity', () => {
    const validationsWithFixed: IValidations = {
      page1: {
        component1: {
          simpleBinding: {
            fixed: ['some error'],
          },
        },
      },
    };

    const validationsWithWarnings: IValidations = {
      page1: {
        component1: {
          simpleBinding: {
            warnings: ['some warning'],
          },
        },
      },
    };

    const validationsWithErrors: IValidations = {
      page1: {
        component1: {
          simpleBinding: {
            errors: ['some error'],
          },
        },
      },
    };

    it('should return true when validations have errors and checking for Severity.Error', () => {
      const result = validation.hasValidationsOfSeverity(validationsWithErrors, Severity.Error);
      expect(result).toBeTruthy();
    });

    it('should return false when validations have warnings and checking for Severity.Error', () => {
      const result = validation.hasValidationsOfSeverity(validationsWithWarnings, Severity.Error);
      expect(result).toBeFalsy();
    });

    it('should return false when validations have no warnings and no errors and checking for Severity.Error', () => {
      const result = validation.hasValidationsOfSeverity(validationsWithFixed, Severity.Error);
      expect(result).toBeFalsy();
    });

    it('should return true when validations have warnings and checking for Severity.Warning', () => {
      const result = validation.hasValidationsOfSeverity(validationsWithWarnings, Severity.Warning);
      expect(result).toBeTruthy();
    });

    it('should return false when validations have errors and checking for Severity.Warning', () => {
      const result = validation.hasValidationsOfSeverity(validationsWithErrors, Severity.Warning);
      expect(result).toBeFalsy();
    });

    it('should return false when validations have no warnings and no errors and checking for Severity.Warning', () => {
      const result = validation.hasValidationsOfSeverity(validationsWithFixed, Severity.Warning);
      expect(result).toBeFalsy();
    });
  });

  it('+++ mergeValidationObjects should merge validation objects successfully', () => {
    const source1: IValidations = {
      layout1: {
        component1: {
          binding: {
            errors: ['some error', 'another error'],
            warnings: ['some warning'],
          },
        },
      },
    };
    const source2: IValidations = {
      layout1: {
        component1: {
          binding: {
            errors: ['some other error'],
            warnings: ['some other warning'],
            fixed: ['another error'],
          },
        },
      },
      layout2: {
        component2: {
          binding: {
            errors: ['some error'],
            warnings: ['some warning'],
          },
        },
      },
    };
    const result: IValidations = validation.mergeValidationObjects(source1, source2);
    expect(result.layout1.component1.binding.errors.length).toEqual(2);
    expect(result.layout1.component1.binding.warnings.length).toEqual(2);
    expect(result.layout2.component2.binding.errors.length).toEqual(1);
    expect(result.layout2.component2.binding.warnings.length).toEqual(1);
  });

  it('+++ validateGroup should detect validation errors for child components', () => {
    const state: IRuntimeState = getInitialStateMock({
      formDataModel: {
        schemas: {
          default: mockJsonSchema,
        },
        error: null,
      },
      instanceData: {
        instance: {
          process: {
            currentTask: {
              elementId: 'default',
            } as any,
          } as any,
        } as any,
        error: null,
      },
      applicationMetadata: {
        applicationMetadata: {
          dataTypes: [{
            appLogic: {}, taskId: 'default', maxCount: 0, minCount: 0, allowedContentTypes: [], id: 'default',
          }],
        } as any,
        error: null,
      },
      formLayout: {
        layouts: mockLayout,
        error: null,
        uiConfig: {
          currentView: 'FormLayout',
          hiddenFields: [],
          repeatingGroups: {
            group1: {
              count: 0,
              editIndex: -1,
            },
          },
        },
      } as any,
      formData: {
        formData: mockFormData,
      } as any,
    });
    const result: IValidations = validation.validateGroup('group1', state);
    expect(result).toEqual({
      FormLayout: {
        'componentId_4-0': {
          simpleBinding: {
            errors: [
              'Feltet er påkrevd',
              getParsedLanguageFromKey(
                `validation_errors.pattern`,
                state.language.language,
                [],
              ),
            ],
            warnings: [],
          },
        },
        'componentId_5-0-1': {
          simpleBinding: {
            errors: [
              getParsedLanguageFromKey(
                `validation_errors.minLength`,
                state.language.language,
                [10],
              ),
            ],
            warnings: [],
          },
        },
      },
    });
  });

  it('+++ validateGroup should detect validation errors for nested group', () => {
    const state: IRuntimeState = getInitialStateMock({
      formDataModel: {
        schemas: {
          default: mockJsonSchema,
        },
        error: null,
      },
      instanceData: {
        instance: {
          process: {
            currentTask: {
              elementId: 'default',
            } as any,
          } as any,
        } as any,
        error: null,
      },
      applicationMetadata: {
        applicationMetadata: {
          dataTypes: [{
            appLogic: {}, taskId: 'default', maxCount: 0, minCount: 0, allowedContentTypes: [], id: 'default',
          }],
        } as any,
        error: null,
      },
      formLayout: {
        layouts: mockLayout,
        error: null,
        uiConfig: {
          currentView: 'FormLayout',
          hiddenFields: [],
          repeatingGroups: {
            group1: {
              count: 0,
              editIndex: -1,
            },
            group2: {
              count: 0,
              editIndex: -1,
            },
          },
        },
      } as any,
      formData: {
        formData: mockFormData,
      } as any,
    });
    const result: IValidations = validation.validateGroup('group2', state);
    expect(result).toEqual({
      FormLayout: {
        'componentId_5-0-1': {
          simpleBinding: {
            errors: [
              getParsedLanguageFromKey(
                `validation_errors.minLength`,
                state.language.language,
                [10],
              ),
            ],
            warnings: [],
          },
        },
      },
    });
  });

  it('+++ removeGroupValidations should remove the groups validations', () => {
    const validations: IValidations = {
      FormLayout: {
        'group1-0': {
          simpleBinding: {
            errors: [
              'Feltet er påkrevd',
            ],
            warnings: [],
          },
        },
        'group1-1': {
          simpleBinding: {
            errors: [
              'Feltet er påkrevd',
            ],
            warnings: [],
          },
        },
        'componentId_4-1': {
          simpleBinding: {
            errors: [
              'Feltet er påkrevd',
            ],
            warnings: [],
          },
        },
      },
    };
    const repeatingGroups: IRepeatingGroups = {
      group1: {
        count: 1,
      },
    };
    const result: IValidations = validation.removeGroupValidationsByIndex('group1', 1, 'FormLayout', mockLayout, repeatingGroups, validations);
    const expected: IValidations = {
      FormLayout: {
        'group1-0': {
          simpleBinding: {
            errors: [
              'Feltet er påkrevd',
            ],
            warnings: [],
          },
        },
      },
    };
    expect(result).toEqual(expected);
  });

  it('+++ removeGroupValidations should shift validations if nessesary', () => {
    const validations: IValidations = {
      FormLayout: {
        'group1-0': {
          simpleBinding: {
            errors: [
              'Feltet er påkrevd',
            ],
            warnings: [],
          },
        },
        'group1-1': {
          simpleBinding: {
            errors: [
              'Feltet er påkrevd',
            ],
            warnings: [],
          },
        },
        'group1-2': {
          simpleBinding: {
            errors: [
              'Should be shifted',
            ],
            warnings: [],
          },
        },
        'componentId_4-2': {
          simpleBinding: {
            errors: [
              'Should be shifted',
            ],
            warnings: [],
          },
        },
      },
    };
    const repeatingGroups: IRepeatingGroups = {
      group1: {
        count: 2,
      },
    };
    const result: IValidations = validation.removeGroupValidationsByIndex('group1', 1, 'FormLayout', mockLayout, repeatingGroups, validations);
    const expected: IValidations = {
      FormLayout: {
        'group1-0': {
          simpleBinding: {
            errors: [
              'Feltet er påkrevd',
            ],
            warnings: [],
          },
        },
        'group1-1': {
          simpleBinding: {
            errors: [
              'Should be shifted',
            ],
            warnings: [],
          },
        },
        'componentId_4-1': {
          simpleBinding: {
            errors: [
              'Should be shifted',
            ],
            warnings: [],
          },
        },
      },
    };
    expect(result).toEqual(expected);
  });

  it('+++ removeGroupValidations should shift a nested repeting group', () => {
    const validations: IValidations = {
      FormLayout: {
        'group1-0': {
          simpleBinding: {
            errors: [
              'Feltet er påkrevd',
            ],
            warnings: [],
          },
        },
        'group2-0-0': {
          simpleBinding: {
            errors: [
              'Feltet er påkrevd',
            ],
            warnings: [],
          },
        },
        'group2-0-1': {
          simpleBinding: {
            errors: [
              'Should be shifted',
            ],
            warnings: [],
          },
        },
        'componentId_5-0-1': {
          simpleBinding: {
            errors: [
              'Should be shifted',
            ],
            warnings: [],
          },
        },
      },
    };
    const repeatingGroups: IRepeatingGroups = {
      group1: {
        count: 0,
      },
      'group2-0': {
        count: 1,
        baseGroupId: 'group2',
      },
    };
    const result: IValidations = validation.removeGroupValidationsByIndex('group2-0', 0, 'FormLayout', mockLayout, repeatingGroups, validations);
    const expected = {
      FormLayout: {
        'group1-0': {
          simpleBinding: {
            errors: [
              'Feltet er påkrevd',
            ],
            warnings: [],
          },
        },
        'group2-0-0': {
          simpleBinding: {
            errors: [
              'Should be shifted',
            ],
            warnings: [],
          },
        },
        'componentId_5-0-0': {
          simpleBinding: {
            errors: [
              'Should be shifted',
            ],
            warnings: [],
          },
        },
      },
    };
    expect(result).toEqual(expected);
  });

  it('+++ removeGroupValidations should remove a groups child groups validations', () => {
    const validations: IValidations = {
      FormLayout: {
        'group1-0': {
          simpleBinding: {
            errors: [
              'Feltet er påkrevd',
            ],
            warnings: [],
          },
        },
        'group2-0-1': {
          simpleBinding: {
            errors: [
              'Feltet er påkrevd',
            ],
            warnings: [],
          },
        },
        'componentId_5-0-0': {
          simpleBinding: {
            errors: [
              'Feltet er påkrevd 1',
            ],
            warnings: [],
          },
        },
        'componentId_5-0-1': {
          simpleBinding: {
            errors: [
              'Feltet er påkrevd 2',
            ],
            warnings: [],
          },
        },
      },
    };
    const repeatingGroups: IRepeatingGroups = {
      group1: {
        count: 0,
      },
      'group2-0': {
        count: 1,
        baseGroupId: 'group2',
      },
    };
    const result: IValidations = validation.removeGroupValidationsByIndex('group1', 0, 'FormLayout', mockLayout, repeatingGroups, validations);
    const expected: IValidations = {
      FormLayout: {},
    };
    expect(result).toEqual(expected);
  });

  it('+++ removeGroupValidations should shift child groups when deleting a parent group index', () => {
    const validations: IValidations = {
      FormLayout: {
        'group1-0': {
          simpleBinding: {
            errors: [
              'Feltet er påkrevd',
            ],
            warnings: [],
          },
        },
        'group2-0-1': {
          simpleBinding: {
            errors: [
              'Feltet er påkrevd',
            ],
            warnings: [],
          },
        },
        'componentId_5-0-1': {
          simpleBinding: {
            errors: [
              'Feltet er påkrevd',
            ],
            warnings: [],
          },
        },
        'componentId_5-1-1': {
          simpleBinding: {
            errors: [
              'Should be shifted',
            ],
            warnings: [],
          },
        },
        'group2-1-1': {
          simpleBinding: {
            errors: [
              'Should be shifted',
            ],
            warnings: [],
          },
        },
      },
    };
    const repeatingGroups: IRepeatingGroups = {
      group1: {
        count: 1,
      },
      'group2-0': {
        count: 1,
        baseGroupId: 'group2',
      },
      'group2-1': {
        count: 1,
        baseGroupId: 'group2',
      },
    };
    const result: IValidations = validation.removeGroupValidationsByIndex('group1', 0, 'FormLayout', mockLayout, repeatingGroups, validations);
    const expected: IValidations = {
      FormLayout: {
        'componentId_5-0-1': {
          simpleBinding: {
            errors: [
              'Should be shifted',
            ],
            warnings: [],
          },
        },
        'group2-0-1': {
          simpleBinding: {
            errors: [
              'Should be shifted',
            ],
            warnings: [],
          },
        },
      },
    };
    expect(result).toEqual(expected);
  });

  it('getUniqueNewElements should return new elements that are not in original array', () => {
    const originalArray = [1, 2, { test: 'Hello' }];
    const newArray = [1, 4, 5, { test: 'Hello' }, { test: 'something' }];
    const expected = [4, 5, { test: 'something' }];
    const actual = validation.getUniqueNewElements(originalArray, newArray);
    expect(actual).toEqual(expected);
  });

  it('mergeComponentBindingValidations should return merged validation object', () => {
    const original: IComponentBindingValidation = mockReduxFormat.FormLayout.componentId_1.simpleBinding;
    const newValidations: IComponentBindingValidation = {
      errors: ['newError'],
      warnings: ['warning'],
    };

    const merged = validation.mergeComponentBindingValidations(original, newValidations);
    expect(merged).toEqual({
      errors: original.errors.concat(newValidations.errors),
      warnings: newValidations.warnings,
    });
  });

  it('mergeValidationObjects should return merged validation object', () => {
    const componentValidation: IComponentValidations = {
      simpleBinding: {
        errors: ['This is a new error'],
        warnings: ['warning!'],
      },
    };
    const newValidations: IValidations = {
      FormLayout: {
        componentId_new: componentValidation,
        componentId_1: componentValidation,
      },
    };

    const merged = validation.mergeValidationObjects(mockReduxFormat, newValidations);
    expect(merged).toEqual({
      ...mockReduxFormat,
      FormLayout: {
        ...mockReduxFormat.FormLayout,
        componentId_1: {
          simpleBinding: {
            errors: mockReduxFormat.FormLayout.componentId_1.simpleBinding.errors
              .concat(componentValidation.simpleBinding.errors),
            warnings: componentValidation.simpleBinding.warnings,
          },
        },
        componentId_new: componentValidation,
      },
    });
  });

  it('getSchemaPart should return items based in a oneOf ref on root', () => {
    const nestedPathResult = validation.getSchemaPart('#/$defs/skjema/properties/alder/maximum', oneOfOnRootSchema);
    expect(nestedPathResult).toEqual(
      {
        type: 'number',
        minimum: 0,
        maximum: 10,
      },
    );
  });

  it('getSchemaPart should return item based on ref on root', () => {
    const result = validation.getSchemaPart('#/definitions/Skjema/properties/person/properties/age/minimum', refOnRootSchema);
    expect(result).toEqual(
      {
        type: 'integer',
        minimum: 0,
        maximum: 100,
      },
    );
  });

  it('getSchemaPart should handle complex schema', () => {
    const result = validation.getSchemaPart('#/$defs/Navn/maxLength', complexSchema);
    expect(result).toEqual(
      {
        type: 'string',
        '@xsdType': 'string',
        '@xsdUnhandledAttributes': {
          'seres:elementtype': 'Dataenkeltype',
          'seres:guid': 'https://seres.no/guid/Kursdomene/Dataenkeltype/Navn/4007',
        },
      },
    );
  });

  it('getSchemaPartOldGenerator should return definition from parent schema', () => {
    const result = validation.getSchemaPartOldGenerator('#/definitions/Name/minimum', refOnRootSchema, '#/definitions/Skjema');
    expect(result).toEqual(
      {
        type: 'string',
        minimum: 5,
        maximum: 10,
      },
    );
  });

  it('getSchemaPartOldGenerator should return property from sub schema', () => {
    const result = validation.getSchemaPartOldGenerator('#/properties/person/properties/age/maximum', refOnRootSchema, '#/definitions/Skjema');
    expect(result).toEqual(
      {
        type: 'integer',
        minimum: 0,
        maximum: 100,
      },
    );
  });

  it('getUnmappedErrors should return unmapped errors', () => {
    const validations: IValidations = {
      unmapped: {
        unmapped: {
          unmapped: {
            errors: ['unmapped1', 'unmapped2'],
          },
        },
      },
    };
    const result = validation.getUnmappedErrors(validations);
    const expected = ['unmapped1', 'unmapped2'];
    expect(result).toEqual(expected);
  });
});
