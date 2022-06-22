import { createElement } from 'react';
import { getInitialStateMock } from '../../__mocks__/initialStateMock';
import { getMockValidationState } from '../../__mocks__/validationStateMock';
import * as oneOfOnRootSchema from '../../__mocks__/json-schema/one-of-on-root.json';
import * as refOnRootSchema from '../../__mocks__/json-schema/ref-on-root.json';
import * as complexSchema from '../../__mocks__/json-schema/complex.json';

import type {
  IValidationIssue,
  IValidations,
  IRepeatingGroups,
  IRuntimeState,
  IComponentBindingValidation,
  IComponentValidations,
  ILayoutValidations,
  ITextResource,
} from 'src/types';
import type { ILayoutComponent, ILayoutGroup } from 'src/features/form/layout';

import { Severity } from 'src/types';
import { getParsedLanguageFromKey } from '../../../shared/src';
import { createRepeatingGroupComponents } from 'src/utils/formLayout';
import { getParsedTextResourceByKey } from 'src/utils/textResource';
import * as validation from './validation';
import { mapToComponentValidations } from './validation';

describe('utils > validation', () => {
  let mockLayout: any;
  let mockReduxFormat: IValidations;
  let mockGroup1: any; // Repeating group
  let mockGroup2: any; // Repeating group nested inside group1
  let mockGroup3: any; // Repeating multiPage group
  let mockComponent4: any; // Required input inside group1
  let mockComponent5: any; // Non-required input inside group2
  let mockLayoutState: any;
  let mockJsonSchema: any;
  let mockInvalidTypes: any;
  let mockFormData: any;
  let mockValidFormData: any;
  let mockFormValidationResult: any;
  let mockLanguage: any;
  let mockFormAttachments: any;
  let mockDataElementValidations: IValidationIssue[];
  let mockTextResources: ITextResource[];

  beforeEach(() => {
    mockLanguage = {
      language: {
        form_filler: {
          error_required: 'Du må fylle ut {0}',
          file_uploader_validation_error_file_number_1:
            'For å fortsette må du laste opp',
          file_uploader_validation_error_file_number_2: 'vedlegg',
          address: 'Gateadresse',
          postPlace: 'Poststed',
          zipCode: 'Postnummer',
        },
        validation: {
          generic_field: 'dette feltet',
        },
        validation_errors: {
          minLength: 'length must be bigger than {0}',
          min: 'must be bigger than {0}',
          pattern: 'Feil format eller verdi',
        },
      },
    };

    mockTextResources = [
      {
        id: 'c1Title',
        value: 'component_1'
      },
      {
        id: 'c2Title',
        value: 'component_2'
      },
      {
        id: 'c3Title',
        value: 'component_3'
      },
      {
        id: 'c4Title',
        value: 'component_4'
      },
      {
        id: 'c5Title',
        value: 'component_5'
      },
      {
        id: 'c6Title',
        value: 'component_6'
      },
    ];

    mockComponent4 = {
      type: 'Input',
      id: 'componentId_4',
      dataModelBindings: {
        simpleBinding: 'group_1.dataModelField_4',
      },
      required: true,
      readOnly: false,
      textResourceBindings: {
        title: 'c4Title',
      },
    };

    mockComponent5 = {
      type: 'Input',
      id: 'componentId_5',
      dataModelBindings: {
        simpleBinding: 'group_1.group_2.dataModelField_5',
      },
      required: false,
      readOnly: false,
      textResourceBindings: {
        title: 'c5Title',
      },
    };

    mockGroup2 = {
      type: 'group',
      id: 'group2',
      dataModelBindings: {
        group: 'group_1.group_2',
      },
      maxCount: 3,
      children: [mockComponent5.id],
    };

    mockGroup1 = {
      type: 'group',
      id: 'group1',
      dataModelBindings: {
        group: 'group_1',
      },
      maxCount: 3,
      children: [mockComponent4.id, mockGroup2.id],
    };

    mockGroup3 = {
      type: 'group',
      id: 'group3',
      dataModelBindings: {
        group: 'group_3',
      },
      maxCount: 2,
      edit: {
        multiPage: true,
      },
      children: [
        // Add your own children (remember page prefixes!)
      ],
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
          textResourceBindings: {
            title: 'c1Title',
          },
        },
        {
          type: 'Input',
          id: 'componentId_2',
          dataModelBindings: {
            customBinding: 'dataModelField_2',
          },
          required: true,
          readOnly: false,
          textResourceBindings: {
            title: 'c2Title',
          },
        },
        {
          type: 'TextArea',
          id: 'componentId_3',
          dataModelBindings: {
            simpleBinding: 'dataModelField_3',
          },
          required: true,
          readOnly: false,
          textResourceBindings: {
            title: 'c3Title',
          },
        },
        mockGroup1,
        mockGroup2,
        mockComponent4,
        {
          type: 'FileUpload',
          id: 'componentId_7',
          dataModelBindings: {},
          maxNumberOfAttachments: '3',
          minNumberOfAttachments: '2',
        },
        mockComponent5,
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
          textResourceBindings: {
            title: 'c6Title',
          },
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
        {
          type: 'group',
          id: 'group_simple',
          dataModelBindings: {
            group: 'group_simple',
          },
          maxCount: 0,
          children: ['required_in_group_simple'],
        },
        {
          type: 'Input',
          id: 'required_in_group_simple',
          dataModelBindings: {
            simpleBinding: 'group_simple.required_in_group_simple',
          },
          required: true,
          readOnly: false,
          textResourceBindings: {},
        }
      ],
    };

    mockFormAttachments = {
      attachments: {
        componentId_4: [
          {
            name: 'test.png',
            size: 75375,
            uploaded: true,
            id: '77a34540-b670-4ede-9379-43df4aaf18b9',
            deleting: false,
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
        {
          dataModelField_4: 'Hello...',
          group_2: [
            { dataModelField_5: 'This does not trigger validation' },
            { dataModelField_5: 'Does.' },
          ],
        },
      ],
    };

    mockValidFormData = {
      dataModelField_1: '12',
      dataModelField_2: 'Really quite long...',
      dataModelField_3: 'Test 123',
      dataModelField_custom: 'abc',
      group_1: [
        {
          dataModelField_4: 'Hello, World!',
          group_2: [
            { dataModelField_5: 'This is long' },
            { dataModelField_5: 'This is also long' },
          ],
        },
        {
          dataModelField_4: 'Not now!',
          group_2: [
            { dataModelField_5: 'This is long' },
            { dataModelField_5: 'Something else that is long' },
          ],
        },
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
                getParsedLanguageFromKey(
                  'validation_errors.min',
                  mockLanguage.language,
                  [0],
                ),
              ],
            },
          },
          componentId_2: {
            customBinding: {
              errors: [
                getParsedLanguageFromKey(
                  'validation_errors.minLength',
                  mockLanguage.language,
                  [10],
                ),
              ],
            },
          },
          'componentId_4-0': {
            simpleBinding: {
              errors: [
                getParsedLanguageFromKey(
                  'validation_errors.pattern',
                  mockLanguage.language,
                ),
              ],
            },
          },
          'componentId_5-0-1': {
            simpleBinding: {
              errors: [
                getParsedLanguageFromKey(
                  'validation_errors.minLength',
                  mockLanguage.language,
                  [10],
                ),
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

  describe('getErrorCount', () => {
    it('should count total number of errors correctly', () => {
      const result = validation.getErrorCount(
        mockFormValidationResult.validations,
      );
      expect(result).toEqual(4);
    });
  });

  describe('canFormBeSaved', () => {
    it('should validate correctly', () => {
      const apiModeComplete = 'Complete';
      const falseResult = validation.canFormBeSaved(
        mockFormValidationResult,
        apiModeComplete,
      );
      const falseResult2 = validation.canFormBeSaved(mockInvalidTypes);
      const trueResult2 = validation.canFormBeSaved(null);
      const trueResult3 = validation.canFormBeSaved(mockFormValidationResult);
      expect(falseResult).toBeFalsy();
      expect(falseResult2).toBeFalsy();
      expect(trueResult2).toBeTruthy();
      expect(trueResult3).toBeTruthy();
    });
  });

  describe('validateFormComponents', () => {
    it('should return error on fileUpload if its not enough files', () => {
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

    it('should return error on fileUpload if its no file', () => {
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

    it('should not return error on fileUpload if its enough files', () => {
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
      const componentSpesificValidations = validation.validateFormComponents(
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

    it('should not return error if element is hidden', () => {
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
      const componentSpesificValidations = validation.validateFormComponents(
        mockFormAttachments.attachments,
        mockLayout,
        Object.keys(mockLayout),
        mockFormData,
        mockLanguage.language,
        ['componentId_4'],
      );

      const mockResult = {
        FormLayout: {},
      };

      expect(componentSpesificValidations).toEqual(mockResult);
    });

    it('should not return error if element is part of layout not present in layoutOrder (sporvalg)', () => {
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
      const componentSpesificValidations = validation.validateFormComponents(
        mockFormAttachments.attachments,
        mockLayout,
        [],
        mockFormData,
        mockLanguage.language,
        [],
      );

      expect(componentSpesificValidations).toEqual({});
    });
  });

  describe('validateEmptyFields', () => {
      it('should return error if empty fields are required', () => {
        const repeatingGroups = {
          group1: {
            index: 0,
            editIndex: -1,
          },
        };
        const componentSpesificValidations = validation.validateEmptyFields(
          mockFormData,
          mockLayout,
          Object.keys(mockLayout),
          mockLanguage.language,
          [],
          repeatingGroups,
          mockTextResources,
        );

        const mockResult = {
          FormLayout: {
            componentId_3: {
              simpleBinding: { errors: ['Du må fylle ut component_3'], warnings: [] },
            },
            'componentId_4-0': {
              simpleBinding: { errors: ['Du må fylle ut component_4'], warnings: [] },
            },
            componentId_6: {
              address: { errors: ['Du må fylle ut Gateadresse'], warnings: [] },
              postPlace: { errors: ['Du må fylle ut Poststed'], warnings: [] },
              zipCode: { errors: ['Du må fylle ut Postnummer'], warnings: [] },
            },
            required_in_group_simple: { simpleBinding: {
                errors: ['Du må fylle ut dette feltet'],
                warnings: [],
            }},
          },
        };

        expect(componentSpesificValidations).toEqual(mockResult);
      });

      it('should not return error for repeating group if child is hidden', () => {
        const repeatingGroups = {
          group1: {
            index: 0,
            editIndex: -1,
          },
        };
        const componentSpesificValidations = validation.validateEmptyFields(
          mockFormData,
          mockLayout,
          Object.keys(mockLayout),
          mockLanguage.language,
          ['componentId_4-0'],
          repeatingGroups,
          mockTextResources,
        );

        const mockResult = {
          FormLayout: {
            componentId_3: {
              simpleBinding: { errors: ['Du må fylle ut component_3'], warnings: [] },
            },
            componentId_6: {
              address: { errors: ['Du må fylle ut Gateadresse'], warnings: [] },
              postPlace: { errors: ['Du må fylle ut Poststed'], warnings: [] },
              zipCode: { errors: ['Du må fylle ut Postnummer'], warnings: [] },
            },
            required_in_group_simple: { simpleBinding: {
              errors: ['Du må fylle ut dette feltet'],
              warnings: [],
            }}
          },
        };

        expect(componentSpesificValidations).toEqual(mockResult);
      });

      it('should not return error if component is not part of layout order (sporvalg)', () => {
        const repeatingGroups = {
          group1: {
            index: 0,
            editIndex: -1,
          },
        };
        const componentSpesificValidations = validation.validateEmptyFields(
          mockFormData,
          mockLayout,
          [],
          mockLanguage.language,
          [],
          repeatingGroups,
          mockTextResources,
        );

        expect(componentSpesificValidations).toEqual({});
      });

      it('should add error to validations if supplied field is required', () => {
        const component = mockLayout.FormLayout.find(
          (c) => c.id === 'componentId_3',
        );
        const validations = {};
        validations[component.id] = validation.validateEmptyField(
          mockFormData,
          component.dataModelBindings,
          component.textResourceBindings,
          mockTextResources,
          mockLanguage.language,
        );

        const mockResult = {
          componentId_3: {
            simpleBinding: { errors: ['Du må fylle ut component_3'], warnings: [] },
          },
        };

        expect(validations).toEqual(mockResult);
      });

      it('should find all errors in an AddressComponent', () => {
        const component = mockLayout.FormLayout.find(
          (c) => c.id === 'componentId_6',
        );
        const validations = {};
        validations[component.id] = validation.validateEmptyField(
          mockFormData,
          component.dataModelBindings,
          component.textResourceBindings,
          mockTextResources,
          mockLanguage.language,
        );

        const mockResult = {
          componentId_6: {
            address: { errors: ['Du må fylle ut Gateadresse'], warnings: [] },
              postPlace: { errors: ['Du må fylle ut Poststed'], warnings: [] },
              zipCode: { errors: ['Du må fylle ut Postnummer'], warnings: [] },
          },
        };

        expect(validations).toEqual(mockResult);
      });
  });

  describe('validateEmptyFieldsForLayout', () => {
    const _with = ({
      formData = {},
      formLayout = mockLayout.FormLayout,
      hiddenFields = [],
      repeatingGroups = {},
    }) => validation.validateEmptyFieldsForLayout(
      formData,
      formLayout,
      mockLanguage.language,
      hiddenFields,
      repeatingGroups,
      mockTextResources,
    );

    const requiredFieldInSimpleGroup = 'required_in_group_simple';
    const requiredError = (name?: string) => {
      const fieldName = name || 'dette feltet';
      return {
        simpleBinding: {
          errors: [`Du må fylle ut ${fieldName}`],
          warnings: [],
        },
      };
    }

    it('should pass validation on required field in hidden group', () => {
      expect(_with({hiddenFields: ['group_simple']})[requiredFieldInSimpleGroup]).toBeUndefined();
    });
    it('should pass validation on required field in group, when field itself is hidden', () => {
      expect(_with({hiddenFields: [requiredFieldInSimpleGroup]})[requiredFieldInSimpleGroup]).toBeUndefined();
    });
    it('should mark as required with required field in visible group', () => {
      expect(_with({hiddenFields: []})[requiredFieldInSimpleGroup]).toEqual(requiredError());
    });

    it('should validate successfully with no instances of repeating groups', () => {
      expect(_with({
        formLayout: [
          mockGroup1,
          mockGroup2,
          mockComponent4,
          {...mockComponent5, required: true},
        ],
        repeatingGroups: {},
      })).toEqual({});
    });

    it('should support nested repeating groups', () => {
      expect(_with({
        formLayout: [
          mockGroup1,
          mockGroup2,
          mockComponent4,
          {...mockComponent5, required: true},
        ],
        repeatingGroups: {
          group1: { index: 2 }, // Group1 has 3 instances
          'group2-0': { index: 1 }, // Group2 has 2 instances inside the first instance of group1
          'group2-1': { index: 0 }, // Group2 has 1 instance inside the second instance of group1
          // Group2 has no instances inside the third instance of group1
        },
      })).toEqual({
        'componentId_4-0': requiredError('component_4'),
        'componentId_4-1': requiredError('component_4'),
        'componentId_4-2': requiredError('component_4'),
        'componentId_5-0-0': requiredError('component_5'),
        'componentId_5-0-1': requiredError('component_5'),
        'componentId_5-1-0': requiredError('component_5'),
      });
    });

    it('should support repeating groups', () => {
      expect(_with({
        formLayout: [mockGroup1, mockGroup2, mockComponent4, mockComponent5],
        repeatingGroups: {
          group1: { index: 1 }, // Group1 has 2 instances
        },
      })).toEqual({
        'componentId_4-0': requiredError('component_4'),
        'componentId_4-1': requiredError('component_4'),
      });
    });

    it('should support multiPage repeating groups', () => {
      expect(_with({
        formLayout: [
          {...mockGroup3, children: [`0:${mockComponent4.id}`, `1:${mockComponent5.id}`]},
          mockComponent4,
          mockComponent5,
        ],
        repeatingGroups: {
          group3: { index: 1 },
        },
      })).toEqual({
        'componentId_4-0': requiredError('component_4'),
        'componentId_4-1': requiredError('component_4'),
      });
    });

    it('should support multiPage repeating and nesting groups', () => {
      expect(_with({
        formLayout: [
          mockGroup1,
          mockGroup2,
          {...mockGroup3, children: [`0:${mockGroup1.id}`, `1:${mockGroup2.id}`]},
          mockComponent4,
          {...mockComponent5, required: true},
        ],
        repeatingGroups: {
          group3: { index: 1 },
          'group1': { index: 1 },
          'group2-0': { index: 0 },
        },
      })).toEqual({
        'componentId_4-0': requiredError('component_4'),
        'componentId_4-1': requiredError('component_4'),
        'componentId_5-0-0': requiredError('component_5'),
      });
    });
  });

  describe('mapDataElementValidationToRedux', () => {
    it('should be mapped correctly to our redux format', () => {
      const mappedDataElementValidations =
        validation.mapDataElementValidationToRedux(
          mockDataElementValidations,
          mockLayoutState.layouts,
          [],
        );
      const expected = getMockValidationState(false);
      expect(mappedDataElementValidations).toEqual(expected);
    });

    it('should map correctly for all possible validations', () => {
      const serverValidationResponse: IValidationIssue[] = [
        {
          field: 'dataModelField_1',
          severity: Severity.Error,
          scope: null,
          targetId: '',
          description: 'Error message',
          code: '',
        },
        {
          field: 'dataModelField_1',
          severity: Severity.Informational,
          scope: null,
          targetId: '',
          description: 'Info message',
          code: '',
        },
        {
          field: 'dataModelField_2',
          severity: Severity.Success,
          scope: null,
          targetId: '',
          description: 'Success message',
          code: '',
        },
        {
          field: 'dataModelField_2',
          severity: Severity.Warning,
          scope: null,
          targetId: '',
          description: 'Warning message',
          code: '',
        },
      ];

      const expectedResult: IValidations = {
        FormLayout: {
          componentId_1: {
            simpleBinding: {
              errors: [getParsedTextResourceByKey('Error message', [])],
              info: [getParsedTextResourceByKey('Info message', [])],
            }
          },
          componentId_2: {
            customBinding: {
              success: [getParsedTextResourceByKey('Success message', [])],
              warnings: [getParsedTextResourceByKey('Warning message', [])],
            }
          }
        }
      };

      const mappedDataElementValidations =
        validation.mapDataElementValidationToRedux(
          serverValidationResponse,
          mockLayoutState.layouts,
          [],
        );

      expect(mappedDataElementValidations).toEqual(expectedResult);
    });

    it('should support mapping to two different components on different pages', () => {
      const mappedDataElementValidations =
        validation.mapDataElementValidationToRedux(
          mockDataElementValidations,
          { ...mockLayoutState.layouts,
            AnotherPage: [
              {
                type: 'Input',
                id: 'AnotherComponent',
                dataModelBindings: {
                  simpleBinding: 'dataModelField_1',
                },
                required: true,
                readOnly: false,
                textResourceBindings: {},
              },
            ]
          },
          [],
        );
      const expected = {
        ...getMockValidationState(false),
        AnotherPage: {
          AnotherComponent: {
            simpleBinding: {
              errors: [getParsedTextResourceByKey('Error message 1', []), getParsedTextResourceByKey('Error message 2', [])],
            },
          }
        }
      }
      expect(mappedDataElementValidations).toEqual(expected);
    });
  });

  describe('validateFormData', () => {
    it('should return error if form data is invalid', () => {
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

    it('should return no errors if form data is valid', () => {
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

    it('should return custom error message when this is defined', () => {
      const mockValidator = validation.createValidator(mockJsonSchema);
      const mockTexts = [
        { id: 'custom_error', value: 'This is a custom error message' },
      ];
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

    it('should return invalidDataTypes=true if form data is wrong type', () => {
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

    it('should not return error if form data is part of layout not present in layoutOrder (sporvalg)', () => {
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
  });

  describe('getIndex', () => {
    it('should return null for field not in repeating group', () => {
      const dataModelBinding = 'dataModelField_1';
      expect(validation.getIndex(dataModelBinding)).toBeNull();
    });

    it('should return index for field in repeating group', () => {
      const dataModelBinding = 'group_1[2].dataModelField_1';
      expect(validation.getIndex(dataModelBinding)).toBe('2');
    });
  });

  describe('componentHasValidations', () => {
    it('should return true if component has validations', () => {
      const validations: IValidations = {
        FormLayout: {
          dummyId: {
            simpleBinding: {
              errors: ['Some error'],
            },
          },
        },
      };
      expect(
        validation.componentHasValidations(validations, 'FormLayout', 'dummyId'),
      ).toBeTruthy();
    });

    it('should return false if component has no validations', () => {
      const validations: IValidations = {
        FormLayout: {
          dummyId: {
            simpleBinding: {
              errors: ['Some error'],
            },
          },
        },
      };
      expect(
        validation.componentHasValidations(
          validations,
          'FormLayout',
          'someOtherId',
        ),
      ).toBeFalsy();
    });

    it('should return false when supplied with null values', () => {
      expect(validation.componentHasValidations(null, null, null)).toBeFalsy();
    });
  });

  describe('repeatingGroupHasValidations', () => {
    it('should return true when components in group has errors', () => {
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
          index: 0,
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
      const groupChildren = createRepeatingGroupComponents(
        group,
        layout.filter((element) => group.children.includes(element.id)),
        0,
        [],
      );
      expect(
        validation.repeatingGroupHasValidations(
          group,
          groupChildren,
          validations,
          'FormLayout',
          repeatingGroups,
          layout,
        ),
      ).toBeTruthy();
    });

    it('should return true when a child group has validations', () => {
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
          index: 0,
          editIndex: -1,
        },
        'group2-0': {
          index: 0,
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
      const groupChildren = createRepeatingGroupComponents(
        group,
        layout.filter((element) => group.children.includes(element.id)),
        0,
        [],
      );
      expect(
        validation.repeatingGroupHasValidations(
          group,
          groupChildren,
          validations,
          'FormLayout',
          repeatingGroups,
          layout,
        ),
      ).toBeTruthy();
    });

    it('should return false when no children has validations', () => {
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
          index: 0,
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

      const groupChildren = createRepeatingGroupComponents(
        group,
        layout.filter((element) => group.children.includes(element.id)),
        0,
        [],
      );
      expect(
        validation.repeatingGroupHasValidations(
          group,
          groupChildren,
          validations,
          'FormLayout',
          repeatingGroups,
          layout,
        ),
      ).toBeFalsy();
    });

    it('should return false when supplied with null values', () => {
      expect(
        validation.repeatingGroupHasValidations(
          null,
          null,
          null,
          null,
          null,
          null,
        ),
      ).toBeFalsy();
    });
  });

  describe('mapToComponentValidations', () => {
    it('should map validation to correct component', () => {
      const validations = {};
      mapToComponentValidations(
        'FormLayout',
        mockLayout.FormLayout,
        'dataModelField_2',
        'some error',
        validations,
      );
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

    it('should map validation to correct component for component in a repeating group', () => {
      const validations = {};
      mapToComponentValidations(
        'FormLayout',
        mockLayout.FormLayout,
        'group_1[0].dataModelField_4',
        'some error',
        validations,
      );
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

    it('should map validation to correct component for component in a nested repeating group', () => {
      const validations = {};
      mapToComponentValidations(
        'FormLayout',
        mockLayout.FormLayout,
        'group_1[0].group_2[0].dataModelField_5',
        'some error',
        validations,
      );
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
      const result = validation.hasValidationsOfSeverity(
        validationsWithErrors,
        Severity.Error,
      );
      expect(result).toBeTruthy();
    });

    it('should return false when validations have warnings and checking for Severity.Error', () => {
      const result = validation.hasValidationsOfSeverity(
        validationsWithWarnings,
        Severity.Error,
      );
      expect(result).toBeFalsy();
    });

    it('should return false when validations have no warnings and no errors and checking for Severity.Error', () => {
      const result = validation.hasValidationsOfSeverity(
        validationsWithFixed,
        Severity.Error,
      );
      expect(result).toBeFalsy();
    });

    it('should return true when validations have warnings and checking for Severity.Warning', () => {
      const result = validation.hasValidationsOfSeverity(
        validationsWithWarnings,
        Severity.Warning,
      );
      expect(result).toBeTruthy();
    });

    it('should return false when validations have errors and checking for Severity.Warning', () => {
      const result = validation.hasValidationsOfSeverity(
        validationsWithErrors,
        Severity.Warning,
      );
      expect(result).toBeFalsy();
    });

    it('should return false when validations have no warnings and no errors and checking for Severity.Warning', () => {
      const result = validation.hasValidationsOfSeverity(
        validationsWithFixed,
        Severity.Warning,
      );
      expect(result).toBeFalsy();
    });
  });

  describe('validateGroup', () => {
    it('should detect validation errors for child components', () => {
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
            dataTypes: [
              {
                appLogic: {
                  classRef: 'Altinn.App.Models.Skjema'
                },
                taskId: 'default',
                maxCount: 0,
                minCount: 0,
                allowedContentTypes: [],
                id: 'default',
              },
            ],
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
                index: 0,
                editIndex: -1,
              },
            },
          },
        } as any,
        formData: {
          formData: mockFormData,
        } as any,
        textResources: {
          error: null,
          language: 'nb',
          resources: mockTextResources,
        }
      });
      const result: IValidations = validation.validateGroup('group1', state);
      expect(result).toEqual({
        FormLayout: {
          'componentId_4-0': {
            simpleBinding: {
              errors: [
                'Du må fylle ut component_4',
                getParsedLanguageFromKey(
                  `validation_errors.pattern`,
                  state.language.language,
                  [],
                ),
              ],
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
            },
          },
        },
      });
    });

    it('should detect validation errors for nested group', () => {
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
            dataTypes: [
              {
                appLogic: {
                  classRef: 'Altinn.App.Models.Skjema'
                },
                taskId: 'default',
                maxCount: 0,
                minCount: 0,
                allowedContentTypes: [],
                id: 'default',
              },
            ],
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
                index: 0,
                editIndex: -1,
              },
              group2: {
                index: 0,
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
            },
          },
        },
      });
    });
  });

  describe('removeGroupValidations', () => {
    it('should remove the groups validations', () => {
      const validations: IValidations = {
        FormLayout: {
          'group1-0': {
            simpleBinding: {
              errors: ['Du må fylle ut dette feltet'],
              warnings: [],
            },
          },
          'group1-1': {
            simpleBinding: {
              errors: ['Du må fylle ut dette feltet'],
              warnings: [],
            },
          },
          'componentId_4-1': {
            simpleBinding: {
              errors: ['Du må fylle ut component_4'],
              warnings: [],
            },
          },
        },
      };
      const repeatingGroups: IRepeatingGroups = {
        group1: {
          index: 1,
        },
      };
      const result: IValidations = validation.removeGroupValidationsByIndex(
        'group1',
        1,
        'FormLayout',
        mockLayout,
        repeatingGroups,
        validations,
      );
      const expected: IValidations = {
        FormLayout: {
          'group1-0': {
            simpleBinding: {
              errors: ['Du må fylle ut dette feltet'],
              warnings: [],
            },
          },
        },
      };
      expect(result).toEqual(expected);
    });

    it('should shift validations if nessesary', () => {
      const validations: IValidations = {
        FormLayout: {
          'group1-0': {
            simpleBinding: {
              errors: ['Du må fylle ut dette feltet'],
              warnings: [],
            },
          },
          'group1-1': {
            simpleBinding: {
              errors: ['Du må fylle ut dette feltet'],
              warnings: [],
            },
          },
          'group1-2': {
            simpleBinding: {
              errors: ['Should be shifted'],
              warnings: [],
            },
          },
          'componentId_4-2': {
            simpleBinding: {
              errors: ['Should be shifted'],
              warnings: [],
            },
          },
        },
      };
      const repeatingGroups: IRepeatingGroups = {
        group1: {
          index: 2,
        },
      };
      const result: IValidations = validation.removeGroupValidationsByIndex(
        'group1',
        1,
        'FormLayout',
        mockLayout,
        repeatingGroups,
        validations,
      );
      const expected: IValidations = {
        FormLayout: {
          'group1-0': {
            simpleBinding: {
              errors: ['Du må fylle ut dette feltet'],
              warnings: [],
            },
          },
          'group1-1': {
            simpleBinding: {
              errors: ['Should be shifted'],
              warnings: [],
            },
          },
          'componentId_4-1': {
            simpleBinding: {
              errors: ['Should be shifted'],
              warnings: [],
            },
          },
        },
      };
      expect(result).toEqual(expected);
    });

    it('should shift a nested repeting group', () => {
      const validations: IValidations = {
        FormLayout: {
          'group1-0': {
            simpleBinding: {
              errors: ['Du må fylle ut dette feltet'],
              warnings: [],
            },
          },
          'group2-0-0': {
            simpleBinding: {
              errors: ['Du må fylle ut dette feltet'],
              warnings: [],
            },
          },
          'group2-0-1': {
            simpleBinding: {
              errors: ['Should be shifted'],
              warnings: [],
            },
          },
          'componentId_5-0-1': {
            simpleBinding: {
              errors: ['Should be shifted'],
              warnings: [],
            },
          },
        },
      };
      const repeatingGroups: IRepeatingGroups = {
        group1: {
          index: 0,
        },
        'group2-0': {
          index: 1,
          baseGroupId: 'group2',
        },
      };
      const result: IValidations = validation.removeGroupValidationsByIndex(
        'group2-0',
        0,
        'FormLayout',
        mockLayout,
        repeatingGroups,
        validations,
      );
      const expected = {
        FormLayout: {
          'group1-0': {
            simpleBinding: {
              errors: ['Du må fylle ut dette feltet'],
              warnings: [],
            },
          },
          'group2-0-0': {
            simpleBinding: {
              errors: ['Should be shifted'],
              warnings: [],
            },
          },
          'componentId_5-0-0': {
            simpleBinding: {
              errors: ['Should be shifted'],
              warnings: [],
            },
          },
        },
      };
      expect(result).toEqual(expected);
    });

    it('should remove a groups child groups validations', () => {
      const validations: IValidations = {
        FormLayout: {
          'group1-0': {
            simpleBinding: {
              errors: ['Du må fylle ut dette feltet'],
              warnings: [],
            },
          },
          'group2-0-1': {
            simpleBinding: {
              errors: ['Du må fylle ut dette feltet'],
              warnings: [],
            },
          },
          'componentId_5-0-0': {
            simpleBinding: {
              errors: ['Du må fylle ut  1'],
              warnings: [],
            },
          },
          'componentId_5-0-1': {
            simpleBinding: {
              errors: ['Du må fylle ut  2'],
              warnings: [],
            },
          },
        },
      };
      const repeatingGroups: IRepeatingGroups = {
        group1: {
          index: 0,
        },
        'group2-0': {
          index: 1,
          baseGroupId: 'group2',
        },
      };
      const result: IValidations = validation.removeGroupValidationsByIndex(
        'group1',
        0,
        'FormLayout',
        mockLayout,
        repeatingGroups,
        validations,
      );
      const expected: IValidations = {
        FormLayout: {},
      };
      expect(result).toEqual(expected);
    });

    it('should shift child groups when deleting a parent group index', () => {
      const validations: IValidations = {
        FormLayout: {
          'group1-0': {
            simpleBinding: {
              errors: ['Du må fylle ut dette feltet'],
              warnings: [],
            },
          },
          'group2-0-1': {
            simpleBinding: {
              errors: ['Du må fylle ut dette feltet'],
              warnings: [],
            },
          },
          'componentId_5-0-1': {
            simpleBinding: {
              errors: ['Du må fylle ut dette feltet'],
              warnings: [],
            },
          },
          'componentId_5-1-1': {
            simpleBinding: {
              errors: ['Should be shifted'],
              warnings: [],
            },
          },
          'group2-1-1': {
            simpleBinding: {
              errors: ['Should be shifted'],
              warnings: [],
            },
          },
        },
      };
      const repeatingGroups: IRepeatingGroups = {
        group1: {
          index: 1,
        },
        'group2-0': {
          index: 1,
          baseGroupId: 'group2',
        },
        'group2-1': {
          index: 1,
          baseGroupId: 'group2',
        },
      };
      const result: IValidations = validation.removeGroupValidationsByIndex(
        'group1',
        0,
        'FormLayout',
        mockLayout,
        repeatingGroups,
        validations,
      );
      const expected: IValidations = {
        FormLayout: {
          'componentId_5-0-1': {
            simpleBinding: {
              errors: ['Should be shifted'],
              warnings: [],
            },
          },
          'group2-0-1': {
            simpleBinding: {
              errors: ['Should be shifted'],
              warnings: [],
            },
          },
        },
      };
      expect(result).toEqual(expected);
    });
  });

  describe('getUniqueNewElements', () => {
    it('should return new elements that are not in original array', () => {
      const originalArray = [1, 2, { test: 'Hello' }];
      const newArray = [1, 4, 5, { test: 'Hello' }, { test: 'something' }];
      const expected = [4, 5, { test: 'something' }];
      const actual = validation.getUniqueNewElements(originalArray, newArray);
      expect(actual).toEqual(expected);
    });
  });

  describe('mergeComponentBindingValidations', () => {
    it('should return merged validation object', () => {
      const original: IComponentBindingValidation =
        mockReduxFormat.FormLayout.componentId_1.simpleBinding;
      const newValidations: IComponentBindingValidation = {
        errors: ['newError'],
        warnings: ['warning'],
      };

      const merged = validation.mergeComponentBindingValidations(
        original,
        newValidations,
      );
      expect(merged).toEqual({
        errors: original.errors.concat(newValidations.errors),
        warnings: newValidations.warnings,
      });
    });

    it('should merge all types of validations and ignore duplicated errors', () => {
      const original: IComponentBindingValidation = {
        errors: ['error1', 'error2'],
        warnings: ['warning1', 'warning2'],
        info: ['info1', 'info2'],
        success: ['success1', 'success2'],
      };
      const newValidations: IComponentBindingValidation = {
        errors: ['error1', 'error3'],
        warnings: ['warning1', 'warning3'],
        info: ['info1', 'info3'],
        success: ['success1', 'success3'],
      };

      const merged = validation.mergeComponentBindingValidations(
        original,
        newValidations
      );

      expect(merged.errors).toEqual(['error1', 'error2', 'error3']);
      expect(merged.warnings).toEqual(['warning1', 'warning2', 'warning3']);
      expect(merged.info).toEqual(['info1', 'info2', 'info3']);
      expect(merged.success).toEqual(['success1', 'success2', 'success3']);
    });
  });

  describe('mergeValidationObjects', () => {
    it('should return merged validation object', () => {
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

      const merged = validation.mergeValidationObjects(
        mockReduxFormat,
        newValidations,
      );
      expect(merged).toEqual({
        ...mockReduxFormat,
        FormLayout: {
          ...mockReduxFormat.FormLayout,
          componentId_1: {
            simpleBinding: {
              errors:
                mockReduxFormat.FormLayout.componentId_1.simpleBinding.errors.concat(
                  componentValidation.simpleBinding.errors,
                ),
              warnings: componentValidation.simpleBinding.warnings,
            },
          },
          componentId_new: componentValidation,
        },
      });
    });

    it('should merge validation objects successfully', () => {
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
      const result: IValidations = validation.mergeValidationObjects(
        source1,
        source2,
      );
      expect(result.layout1.component1.binding.errors.length).toEqual(2);
      expect(result.layout1.component1.binding.warnings.length).toEqual(2);
      expect(result.layout2.component2.binding.errors.length).toEqual(1);
      expect(result.layout2.component2.binding.warnings.length).toEqual(1);
    });
  });

  describe('getSchemaPart', () => {
    it('should return items based in a oneOf ref on root', () => {
      const nestedPathResult = validation.getSchemaPart(
        '#/$defs/skjema/properties/alder/maximum',
        oneOfOnRootSchema,
      );
      expect(nestedPathResult).toEqual({
        type: 'number',
        minimum: 0,
        maximum: 10,
      });
    });

    it('should return item based on ref on root', () => {
      const result = validation.getSchemaPart(
        '#/definitions/Skjema/properties/person/properties/age/minimum',
        refOnRootSchema,
      );
      expect(result).toEqual({
        type: 'integer',
        minimum: 0,
        maximum: 100,
      });
    });

    it('should handle complex schema', () => {
      const result = validation.getSchemaPart(
        '#/$defs/Navn/maxLength',
        complexSchema,
      );
      expect(result).toEqual({
        type: 'string',
        '@xsdType': 'string',
        '@xsdUnhandledAttributes': {
          'seres:elementtype': 'Dataenkeltype',
          'seres:guid':
            'https://seres.no/guid/Kursdomene/Dataenkeltype/Navn/4007',
        },
      });
    });
  });

  describe('getSchemaPartOldGenerator', () => {
    it('should return definition from parent schema', () => {
      const result = validation.getSchemaPartOldGenerator(
        '#/definitions/Name/minimum',
        refOnRootSchema,
        '#/definitions/Skjema',
      );
      expect(result).toEqual({
        type: 'string',
        minimum: 5,
        maximum: 10,
      });
    });

    it('should return property from sub schema', () => {
      const result = validation.getSchemaPartOldGenerator(
        '#/properties/person/properties/age/maximum',
        refOnRootSchema,
        '#/definitions/Skjema',
      );
      expect(result).toEqual({
        type: 'integer',
        minimum: 0,
        maximum: 100,
      });
    });
  });

  describe('getUnmappedErrors', () => {
    it('should return unmapped errors', () => {
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

  describe('missingFieldsInLayoutValidations', () => {
    it('should return false when validations contain no messages for missing fields', () => {
      const validations: ILayoutValidations = {
        field: {
          'simple_binding': {
            errors: ['Some random error'],
            warnings: [],
          }
        }
      };
      const result = validation.missingFieldsInLayoutValidations(validations, mockLanguage.language);
      expect(result).toBeFalsy();
    });
    it('should return true when validations contain messages (string) for missing fields', () => {
      const validations: ILayoutValidations = {
        field: {
          'simple_binding': {
            errors: ['Some random error', 'Du må fylle ut dette feltet'],
            warnings: [],
          }
        }
      };
      const result = validation.missingFieldsInLayoutValidations(validations, mockLanguage.language);
      expect(result).toBeTruthy();
    });
    it('should return true when validations contain messages (react element) for missing fields', () => {
      const node = createElement('span', {}, 'Du må fylle ut ');
      const validations: ILayoutValidations = {
        field: {
          'simple_binding': {
            errors: ['Some random error', node],
            warnings: [],
          }
        }
      };
      const result = validation.missingFieldsInLayoutValidations(validations, mockLanguage.language);
      expect(result).toBeTruthy();
    });
    it('should return true when validations contain arrays with error message for missing fields', () => {
      const validations = (err:any[]):ILayoutValidations => ({
        field: {
          'simple_binding': {
            errors: ['Some random error', err],
            warnings: [],
          }
        }
      });
      const shallow = ['Første linje', "\n", 'Du må fylle ut '];
      const deep = ['Dette er feil:', ['Første linje', "\n", 'Du må fylle ut ']];
      const withNode = ['Dette er feil:', ['Første linje', "\n", createElement('span', {}, 'Du må fylle ut ')]];
      expect(validation.missingFieldsInLayoutValidations(validations(shallow), mockLanguage.language)).toBeTruthy();
      expect(validation.missingFieldsInLayoutValidations(validations(deep), mockLanguage.language)).toBeTruthy();
      expect(validation.missingFieldsInLayoutValidations(validations(withNode), mockLanguage.language)).toBeTruthy();
    });

  });
});
