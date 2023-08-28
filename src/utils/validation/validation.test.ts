import type { ErrorObject } from 'ajv';

import { staticUseLanguageForTests } from 'src/hooks/useLanguage';
import { isOneOfError } from 'src/utils/validation/schemaValidation';
import * as validation from 'src/utils/validation/validation';
import type { IUseLanguage } from 'src/hooks/useLanguage';
import type { IRepeatingGroups, ITextResource } from 'src/types';
import type { ILayoutValidations, IValidations } from 'src/utils/validation/types';

// Mock dateformat
jest.mock('src/utils/dateHelpers', () => ({
  __esModules: true,
  ...jest.requireActual('src/utils/dateHelpers'),
  getDateFormat: jest.fn(() => 'DD.MM.YYYY'),
}));

describe('utils > validation', () => {
  let mockLayout: any;
  let mockGroup1: any; // Repeating group
  let mockGroup2: any; // Repeating group nested inside group1
  let mockComponent4: any; // Required input inside group1
  let mockComponent5: any; // Non-required input inside group2
  let mockInvalidTypes: any;
  let mockFormValidationResult: any;
  let mockLanguage: any;
  let mockTextResources: ITextResource[];
  let mockLangTools: IUseLanguage;

  beforeEach(() => {
    mockLanguage = {
      language: {
        form_filler: {
          error_required: 'Du må fylle ut {0}',
          file_uploader_validation_error_file_number_1: 'For å fortsette må du laste opp',
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
          minItems: 'Du må legge til minst {0} rader',
        },
        date_picker: {
          invalid_date_message: 'Invalid date format. Use the format {0}.',
          min_date_exeeded: 'Date should not be before minimal date',
          max_date_exeeded: 'Date should not be after maximal date',
        },
      },
    };

    mockTextResources = [
      {
        id: 'c1Title',
        value: 'component_1',
      },
      {
        id: 'c2Title',
        value: 'component_2',
      },
      {
        id: 'c3Title',
        value: 'component_3',
      },
      {
        id: 'c4Title',
        value: 'component_4',
      },
      {
        id: 'c4RequiredValidation',
        value: 'Component_4 feltet er påkrevd og må besvares',
      },
      {
        id: 'c5Title',
        value: 'component_5',
      },
      {
        id: 'c6Title',
        value: 'component_6',
      },
      {
        id: 'withGroupVariables',
        value: '{0}',
        variables: [
          {
            key: 'group_1[{0}].dataModelField_4',
            dataSource: 'dataModel.default',
          },
        ],
      },
      {
        id: 'custom_error',
        value: 'This is a custom error message',
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
        requiredValidation: 'c4RequiredValidation',
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
      type: 'Group',
      id: 'group2',
      dataModelBindings: {
        group: 'group_1.group_2',
      },
      maxCount: 3,
      children: [mockComponent5.id],
    };

    mockGroup1 = {
      type: 'Group',
      id: 'group1',
      dataModelBindings: {
        group: 'group_1',
      },
      maxCount: 3,
      children: [mockComponent4.id, mockGroup2.id],
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
          type: 'Group',
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
        },
      ],
    };

    mockFormValidationResult = {
      validations: {
        FormLayout: {
          componentId_1: {
            simpleBinding: {
              errors: ['must be bigger than 0'],
            },
          },
          componentId_2: {
            customBinding: {
              errors: ['length must be bigger than 10'],
            },
          },
          'componentId_4-0': {
            simpleBinding: {
              errors: ['Feil format eller verdi'],
            },
          },
          'componentId_5-0-1': {
            simpleBinding: {
              errors: ['length must be bigger than 10'],
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

    mockLangTools = staticUseLanguageForTests({ textResources: mockTextResources, language: mockLanguage.language });

    /**
     * Silences deprecation warning about jsPropertySyntax from Ajv, so we don't pollute our test runner output with
     * these warnings. We already know about the deprecation of jsPropertySyntax, and our tests will fail if/when
     * AJV decides to completely remove support for this syntax.
     *
     * @see createValidator
     */
    const oldConsoleWarn = console.warn;
    console.warn = (...args: any[]) => {
      if (typeof args[0] === 'string' && args[0].match(/DEPRECATED: option jsPropertySyntax/)) {
        return;
      }

      oldConsoleWarn(...args);
    };
  });

  describe('canFormBeSaved', () => {
    it('should validate correctly', () => {
      const falseResult = validation.canFormBeSaved(mockFormValidationResult);
      const falseResult2 = validation.canFormBeSaved(mockInvalidTypes);
      const trueResult2 = validation.canFormBeSaved(null);
      expect(falseResult).toBeFalsy();
      expect(falseResult2).toBeFalsy();
      expect(trueResult2).toBeTruthy();
    });
  });

  describe('isOneOfError', () => {
    it('should return fasle if provided error does not have keyword `oneOf`', () => {
      const error: ErrorObject = {
        keyword: 'test',
        instancePath: '',
        schemaPath: '',
        params: {},
      };
      const result = isOneOfError(error);
      expect(result).toBeFalsy();
    });
    it('should return true if provided error has keyword `oneOf`', () => {
      const error: ErrorObject = {
        keyword: 'oneOf',
        instancePath: '',
        schemaPath: '',
        params: {},
      };
      const result = isOneOfError(error);
      expect(result).toBeTruthy();
    });

    it('should return true if provided error has param "type: null"', () => {
      const error: ErrorObject = {
        keyword: 'test',
        instancePath: '',
        schemaPath: '',
        params: {
          type: 'null',
        },
      };
      const result = isOneOfError(error);
      expect(result).toBeTruthy();
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
          simple_binding: {
            errors: ['Some random error'],
            warnings: [],
          },
        },
      };
      const result = validation.missingFieldsInLayoutValidations(validations, [], mockLangTools);
      expect(result).toBeFalsy();
    });
    it('should return true when validations contain messages (string) for missing fields', () => {
      const validations: ILayoutValidations = {
        field: {
          simple_binding: {
            errors: ['Some random error', 'Du må fylle ut dette feltet'],
            warnings: [],
          },
        },
      };
      const result = validation.missingFieldsInLayoutValidations(validations, [], mockLangTools);
      expect(result).toBeTruthy();
    });
    it('should return true when validations contain arrays with error message for missing fields', () => {
      const validations = (err: string): ILayoutValidations => ({
        field: {
          simple_binding: {
            errors: ['Some random error', err],
            warnings: [],
          },
        },
      });
      const shallow = 'Første linje\nDu må fylle ut ';
      const deep = 'Dette er feil:\nFørste linje\nDu må fylle ut ';
      expect(validation.missingFieldsInLayoutValidations(validations(shallow), [], mockLangTools)).toBeTruthy();
      expect(validation.missingFieldsInLayoutValidations(validations(deep), [], mockLangTools)).toBeTruthy();
    });
  });
});
