import parseHtmlToReact from 'html-react-parser';

import { parseOptions } from 'src/language/sharedLanguage';
import { AsciiUnitSeparator } from 'src/utils/attachment';
import {
  atleastOneTagExists,
  componentHasValidationMessages,
  getDisplayFormData,
  getFieldName,
  getFileUploadComponentValidations,
  getFormDataForComponentInRepeatingGroup,
  gridBreakpoints,
  isAttachmentError,
  isComponentValid,
  isNotAttachmentError,
  parseFileUploadComponentWithTagValidationObject,
  selectComponentTexts,
  smartLowerCaseFirst,
} from 'src/utils/formComponentUtils';
import type { ExprUnresolved } from 'src/features/expressions/types';
import type { IFormData } from 'src/features/form/data';
import type { ILayoutCompCheckboxes } from 'src/layout/Checkboxes/types';
import type { ILayoutCompFileUpload } from 'src/layout/FileUpload/types';
import type { IGridStyling, ILayoutComponent } from 'src/layout/layout';
import type { ILayoutCompRadioButtons } from 'src/layout/RadioButtons/types';
import type { IAttachment, IAttachments } from 'src/shared/resources/attachments';
import type {
  IComponentBindingValidation,
  IComponentValidations,
  IOptions,
  IRepeatingGroups,
  ITextResource,
} from 'src/types';

describe('formComponentUtils', () => {
  const mockFormData: IFormData = {
    mockBindingInput: 'test',
    mockBindingCheckbox: 'optionValue1,optionValue2',
    'group[0].checkbox': 'repOptionValue1,repOptionValue2,repOptionValue3',
    mockBindingCheckboxWithMapping: 'mockOptionsWithMapping1,mockOptionsWithMapping2',
    mockBindingDropdown: 'optionValue1',
    mockBindingDropdownWithMapping: 'mockOptionsWithMapping1',
    mockBindingRadioButtons: 'optionValue1',
    mockBindingRadioButtonsWithMapping: 'mockOptionsWithMapping1',
    mockBindingLikert: 'optionValue1',
    mockBindingLikertWithMapping: 'mockOptionsWithMapping1',
    mockBindingDropdownWithReduxOptions: 'mockReduxOptionValue',
    'someGroup[0].fieldUsedAsValue': 'mockReduxOptionValue',
    'someGroup[0].fieldUsedAsLabel': 'mockReduxOptionLabel',
    mockBindingAttachmentSingle: '12345',
    'mockBindingAttachmentMulti[0]': '123457',
    'mockBindingAttachmentMulti[1]': '123456',
  };
  const mockTextResources: ITextResource[] = [
    {
      id: 'textKey1',
      value: 'Value1',
    },
    {
      id: 'textKey2',
      value: 'Value2',
    },
    {
      id: 'repTextKey1',
      value: 'RepValue1',
    },
    {
      id: 'repTextKey2',
      value: 'RepValue2',
    },
    {
      id: 'repTextKey3',
      value: 'RepValue3',
    },
    {
      id: 'dropdown.label',
      value: 'Label value: {0}',
      unparsedValue: 'Label value: {0}',
      variables: [
        {
          key: 'someGroup[{0}].fieldUsedAsLabel',
          dataSource: 'dataModel.default',
        },
      ],
    },
  ];
  const mockOptions: IOptions = {
    mockOption: {
      id: 'mockOption',
      options: [
        { value: 'optionValue1', label: 'textKey1' },
        { value: 'optionValue2', label: 'textKey2' },
      ],
    },
    mockRepOption: {
      id: 'mockRepOption',
      options: [
        { value: 'repOptionValue1', label: 'repTextKey1' },
        { value: 'repOptionValue2', label: 'repTextKey2' },
        { value: 'repOptionValue3', label: 'repTextKey3' },
      ],
    },
    '{"id":"mockOptionsWithMapping","mapping":{"someDataField":"someUrlParam"}}': {
      id: 'mockOptionsWithMapping',
      mapping: { someDataField: 'someUrlParam' },
      options: [
        { value: 'mockOptionsWithMapping1', label: 'Value Mapping 1' },
        { value: 'mockOptionsWithMapping2', label: 'Value Mapping 2' },
      ],
    },
  };
  const mockAttachments: IAttachments = {
    upload: [
      {
        uploaded: true,
        updating: false,
        deleting: false,
        name: 'mockNameAttachment1',
        size: 12345,
        tags: ['mockTag'],
        id: '12345',
      },
      {
        uploaded: true,
        updating: false,
        deleting: false,
        name: 'mockNameAttachment2',
        size: 12345,
        tags: [],
        id: '123456',
      },
      {
        uploaded: true,
        updating: false,
        deleting: false,
        name: 'mockNameAttachment3',
        size: 12345,
        id: '123457',
      },
    ],
  };
  const mockAttachmentsWithoutTag: IAttachment[] = [
    {
      uploaded: true,
      updating: false,
      deleting: false,
      name: 'mockName',
      size: 12345,
      tags: [],
      id: '12345',
    },
    {
      uploaded: true,
      updating: false,
      deleting: false,
      name: 'mockName',
      size: 12345,
      tags: [],
      id: '123456',
    },
    {
      uploaded: true,
      updating: false,
      deleting: false,
      name: 'mockName',
      size: 12345,
      id: '123457',
    },
  ];

  const mockRepeatingGroups: IRepeatingGroups = {};

  describe('getFormDataForComponentInRepeatingGroup', () => {
    it('should return comma separated string of text resources for checkboxes with multiple values', () => {
      const checkboxComponent: ExprUnresolved<ILayoutCompCheckboxes> = {
        id: 'whatever',
        type: 'Checkboxes',
        optionsId: 'mockRepOption',
        dataModelBindings: {
          simpleBinding: 'group.checkbox',
        },
      };
      const result = getFormDataForComponentInRepeatingGroup(
        mockFormData,
        mockAttachments,
        checkboxComponent,
        0,
        'group',
        mockTextResources,
        mockOptions,
        mockRepeatingGroups,
      );
      expect(result).toEqual('RepValue1, RepValue2, RepValue3');
    });
  });

  describe('getDisplayFormData', () => {
    it('should return form data for a component', () => {
      const inputComponent: ExprUnresolved<ILayoutComponent> = {
        id: 'whatever',
        type: 'Input',
      };
      const result = getDisplayFormData(
        'mockBindingInput',
        inputComponent,
        inputComponent.id,
        {},
        mockFormData,
        mockOptions,
        mockTextResources,
        mockRepeatingGroups,
      );
      expect(result).toEqual('test');
    });

    it('should return comma separated string of text resources for checkboxes with multiple values', () => {
      const checkboxComponent: ExprUnresolved<ILayoutCompCheckboxes> = {
        id: 'whatever',
        type: 'Checkboxes',
        optionsId: 'mockOption',
      };
      const result = getDisplayFormData(
        'mockBindingCheckbox',
        checkboxComponent,
        checkboxComponent.id,
        mockAttachments,
        mockFormData,
        mockOptions,
        mockTextResources,
        mockRepeatingGroups,
      );
      expect(result).toEqual('Value1, Value2');
    });

    it('should return comma separated string of text resources for checkboxes with multiple values and mapping', () => {
      const checkboxComponent: ExprUnresolved<ILayoutCompCheckboxes> = {
        id: 'whatever',
        type: 'Checkboxes',
        optionsId: 'mockOptionsWithMapping',
        mapping: { someDataField: 'someUrlParam' },
      };
      const result = getDisplayFormData(
        'mockBindingCheckboxWithMapping',
        checkboxComponent,
        checkboxComponent.id,
        mockAttachments,
        mockFormData,
        mockOptions,
        mockTextResources,
        mockRepeatingGroups,
      );
      expect(result).toEqual('Value Mapping 1, Value Mapping 2');
    });

    it('should return object with text resources for checkboxes with multiple values when asObject parameter is true', () => {
      const checkboxComponent: ExprUnresolved<ILayoutCompCheckboxes> = {
        id: 'whatever',
        type: 'Checkboxes',
        optionsId: 'mockOption',
      };
      const result = getDisplayFormData(
        'mockBindingCheckbox',
        checkboxComponent,
        checkboxComponent.id,
        mockAttachments,
        mockFormData,
        mockOptions,
        mockTextResources,
        mockRepeatingGroups,
        true,
      );
      const expected = {
        optionValue1: 'Value1',
        optionValue2: 'Value2',
      };
      expect(result).toEqual(expected);
    });

    it.each(['Likert', 'Dropdown', 'RadioButtons'])(
      'should return text resource for %s component',
      (type: 'Likert' | 'Dropdown' | 'RadioButtons') => {
        const component: ExprUnresolved<ILayoutComponent<typeof type>> = {
          id: 'whatever',
          type,
          optionsId: 'mockOption',
        };
        const result = getDisplayFormData(
          `mockBinding${type}`,
          component,
          component.id,
          mockAttachments,
          mockFormData,
          mockOptions,
          mockTextResources,
          mockRepeatingGroups,
        );
        expect(result).toEqual('Value1');
      },
    );

    it.each(['Likert', 'Dropdown', 'RadioButtons'])(
      'should return text resource for %s component with mapping',
      (type: 'Likert' | 'Dropdown' | 'RadioButtons') => {
        const component: ExprUnresolved<ILayoutComponent<typeof type>> = {
          id: 'whatever',
          type,
          optionsId: 'mockOptionsWithMapping',
          mapping: { someDataField: 'someUrlParam' },
        };
        const result = getDisplayFormData(
          `mockBinding${type}WithMapping`,
          component,
          component.id,
          mockAttachments,
          mockFormData,
          mockOptions,
          mockTextResources,
          mockRepeatingGroups,
        );
        expect(result).toEqual('Value Mapping 1');
      },
    );

    it('should return text resource for radio button component', () => {
      const radioButtonComponent: ExprUnresolved<ILayoutCompRadioButtons> = {
        type: 'RadioButtons',
        optionsId: 'mockOption',
        id: 'some-id',
      };
      const result = getDisplayFormData(
        'mockBindingRadioButtons',
        radioButtonComponent,
        radioButtonComponent.id,
        mockAttachments,
        mockFormData,
        mockOptions,
        mockTextResources,
        mockRepeatingGroups,
      );
      expect(result).toEqual('Value1');
    });

    it('should return text resource for radio button component with mapping', () => {
      const radioButtonComponentWithMapping: ExprUnresolved<ILayoutCompRadioButtons> = {
        type: 'RadioButtons',
        optionsId: 'mockOptionsWithMapping',
        mapping: { someDataField: 'someUrlParam' },
        id: 'some-id',
      };
      const result = getDisplayFormData(
        'mockBindingRadioButtonsWithMapping',
        radioButtonComponentWithMapping,
        radioButtonComponentWithMapping.id,
        mockAttachments,
        mockFormData,
        mockOptions,
        mockTextResources,
        mockRepeatingGroups,
      );
      expect(result).toEqual('Value Mapping 1');
    });

    it('should return correct label for dropdown setup with options from redux', () => {
      const dropdownComponentWithReduxOptions: ExprUnresolved<ILayoutCompRadioButtons> = {
        type: 'RadioButtons',
        id: 'some-id',
        source: {
          group: 'someGroup',
          label: 'dropdown.label',
          value: 'someGroup[{0}].fieldUsedAsValue',
        },
      };

      const repGroups: IRepeatingGroups = {
        group1: {
          index: 0,
          dataModelBinding: 'someGroup',
        },
      };

      const result = getDisplayFormData(
        'mockBindingDropdownWithReduxOptions',
        dropdownComponentWithReduxOptions,
        dropdownComponentWithReduxOptions.id,
        mockAttachments,
        mockFormData,
        mockOptions,
        mockTextResources,
        repGroups,
      );

      expect(result).toEqual('Label value: mockReduxOptionLabel');
    });

    it('should return a single attachment name for a FileUpload component', () => {
      const component: ExprUnresolved<ILayoutCompFileUpload> = {
        id: 'upload',
        type: 'FileUpload',
        dataModelBindings: {
          simpleBinding: 'mockBindingAttachmentSingle',
        },
        minNumberOfAttachments: 1,
        maxNumberOfAttachments: 2,
        maxFileSizeInMB: 15,
        displayMode: 'simple',
      };
      const result = getDisplayFormData(
        component.dataModelBindings?.simpleBinding,
        component,
        component.id,
        mockAttachments,
        mockFormData,
        mockOptions,
        mockTextResources,
        mockRepeatingGroups,
      );
      expect(result).toEqual('mockNameAttachment1');
    });

    it('should return multiple attachment names for a FileUpload component', () => {
      const component: ExprUnresolved<ILayoutCompFileUpload> = {
        id: 'upload',
        type: 'FileUpload',
        dataModelBindings: {
          list: 'mockBindingAttachmentMulti',
        },
        minNumberOfAttachments: 1,
        maxNumberOfAttachments: 2,
        maxFileSizeInMB: 15,
        displayMode: 'simple',
      };
      const result = getDisplayFormData(
        component.dataModelBindings?.list,
        component,
        component.id,
        mockAttachments,
        mockFormData,
        mockOptions,
        mockTextResources,
        mockRepeatingGroups,
      );
      expect(result).toEqual('mockNameAttachment3, mockNameAttachment2');
    });
  });

  describe('selectComponentTexts', () => {
    it('should return value of mapped textResourceBinding', () => {
      const textResourceBindings = {
        title: 'textKey2',
      };
      const result = selectComponentTexts(mockTextResources, textResourceBindings);

      expect(result).toEqual({
        title: parseHtmlToReact(`<span>Value2</span>`, parseOptions),
      });
    });

    it('should return empty object when no textResourceBindings are provided', () => {
      const result = selectComponentTexts(mockTextResources, undefined);

      expect(result).toEqual({});
    });

    it('should return original key when textResourceBinding key is not found in textResources', () => {
      const textResourceBindings = {
        title: 'key-that-does-not-exist',
      };
      const result = selectComponentTexts(mockTextResources, textResourceBindings);

      expect(result).toEqual({
        title: 'key-that-does-not-exist',
      });
    });
  });

  describe('isComponentValid', () => {
    it('should return false when validations has errors', () => {
      const result = isComponentValid({
        simpleBinding: {
          errors: ['has error'],
          warnings: [],
        },
      });

      expect(result).toBe(false);
    });

    it('should return false when validations has errors and warnings', () => {
      const result = isComponentValid({
        simpleBinding: {
          errors: ['has error'],
          warnings: ['has warning'],
        },
      });

      expect(result).toBe(false);
    });

    it('should return true when validations has warnings', () => {
      const result = isComponentValid({
        simpleBinding: {
          errors: [],
          warnings: ['has warnings'],
        },
      });

      expect(result).toBe(true);
    });

    it('should return true when validations has no warnings or errors', () => {
      const result = isComponentValid({
        simpleBinding: {
          errors: [],
          warnings: [],
        },
      });

      expect(result).toBe(true);
    });
  });

  describe('isAttachmentError', () => {
    it('should return true when error has attachmentId', () => {
      const error = {
        id: 'mockUUID',
        message: 'mockMessage',
      };
      const result = isAttachmentError(error);
      expect(result).toEqual(true);
    });

    it('should return false when error does not have attachmentId', () => {
      const error = {
        id: null,
        message: 'mockMessage',
      };
      const result = isAttachmentError(error);
      expect(result).toEqual(false);
    });
  });

  describe('isNotAttachmentError', () => {
    it('should return true when error does not have attachmentId', () => {
      const error = {
        id: null,
        message: 'mockMessage',
      };
      const result = isNotAttachmentError(error);
      expect(result).toEqual(true);
    });

    it('should return false when error has attachmentId', () => {
      const error = {
        id: 'mockUUID',
        message: 'mockMessage',
      };
      const result = isNotAttachmentError(error);
      expect(result).toEqual(false);
    });
  });

  describe('atleastOneTagExists', () => {
    it('should return true if one or more attachments has a tag', () => {
      const result = atleastOneTagExists(mockAttachments['upload']);
      expect(result).toEqual(true);
    });

    it('should return false if none of the attachments has a tag', () => {
      const result = atleastOneTagExists(mockAttachmentsWithoutTag);
      expect(result).toEqual(false);
    });
  });

  describe('componentHasValidationMessages', () => {
    it.each(['errors', 'warnings', 'success', 'info'])(
      'should return true if validation message exists in %p array',
      (type: keyof IComponentBindingValidation) => {
        const validations: IComponentValidations = {
          simpleBinding: {
            [type]: ['some message'],
          },
        };
        const result = componentHasValidationMessages(validations);
        expect(result).toEqual(true);
      },
    );
  });

  describe('getFieldName', () => {
    const textResources = [
      { id: 'title', value: 'Component name' },
      { id: 'short', value: 'name' },
    ];
    const mockLanguage = {
      form_filler: {
        error_required: 'Du må fylle ut {0}',
        address: 'Gateadresse',
        postPlace: 'Poststed',
        zipCode: 'Postnummer',
      },
      validation: {
        generic_field: 'dette feltet',
      },
    };

    it('should return field text from languages when fieldKey is present', () => {
      const result = getFieldName({ title: 'title' }, textResources, mockLanguage, 'address');
      expect(result).toEqual('gateadresse');
    });

    it('should return component shortName (textResourceBindings) when no fieldKey is present', () => {
      const result = getFieldName({ title: 'title', shortName: 'short' }, textResources, mockLanguage);
      expect(result).toEqual('name');
    });

    it('should return component title (textResourceBindings) when no shortName (textResourceBindings) and no fieldKey is present', () => {
      const result = getFieldName({ title: 'title' }, textResources, mockLanguage);
      expect(result).toEqual('component name');
    });

    it('should return generic field name when fieldKey, shortName and title are all not available', () => {
      const result = getFieldName({ something: 'someTextKey' }, textResources, mockLanguage);
      expect(result).toEqual('dette feltet');
    });
  });

  describe('smartLowerCaseFirst', () => {
    it.each([
      { input: 'Fornavn', expected: 'fornavn' },
      { input: 'fornavn', expected: 'fornavn' },
      { input: 'Postnummer', expected: 'postnummer' },
      { input: 'AlfabeteT', expected: 'alfabeteT' },
      {
        input: 'Den dominikanske Republikk',
        expected: 'den dominikanske Republikk',
      },
      {
        input: 'Den Dominikanske Republikk',
        expected: 'Den Dominikanske Republikk',
      },
      { input: 'Sas', expected: 'sas' },
      { input: 'SAS', expected: 'SAS' },
      { input: 'SERIOUSLY', expected: 'SERIOUSLY' },
      { input: 'ÆØÅ', expected: 'ÆØÅ' },
      { input: 'Grünerløkka', expected: 'grünerløkka' },
      { input: 'D.o.B.', expected: 'D.o.B.' },
      { input: 'SaaB', expected: 'SaaB' },
      { input: 'S.a.a.B', expected: 'S.a.a.B' },
      { input: '¿Cómo te llamas?', expected: '¿cómo te llamas?' },
    ])('Should convert $input to $expected', ({ input, expected }) => {
      expect(smartLowerCaseFirst(input)).toEqual(expected);
    });
  });

  describe('getFileUploadWithTagComponentValidations', () => {
    it('should return correct validation', () => {
      const mockLanguage = {
        language: {
          form_filler: {
            file_uploader_validation_error_delete: 'Noe gikk galt under slettingen av filen, prøv igjen senere.',
            file_uploader_validation_error_upload: 'Noe gikk galt under opplastingen av filen, prøv igjen senere.',
            file_uploader_validation_error_update:
              'Noe gikk galt under oppdatering av filens merking, prøv igjen senere.',
          },
        },
      };

      const uploadValidation = getFileUploadComponentValidations('upload', mockLanguage.language);
      expect(uploadValidation).toEqual({
        simpleBinding: {
          errors: ['Noe gikk galt under opplastingen av filen, prøv igjen senere.'],
          warnings: [],
        },
      });

      const updateValidation = getFileUploadComponentValidations('update', mockLanguage.language);
      expect(updateValidation).toEqual({
        simpleBinding: {
          errors: ['Noe gikk galt under oppdatering av filens merking, prøv igjen senere.'],
          warnings: [],
        },
      });

      const updateValidationWithId = getFileUploadComponentValidations(
        'update',
        mockLanguage.language,
        'mock-attachment-id',
      );
      expect(updateValidationWithId).toEqual({
        simpleBinding: {
          errors: [
            `mock-attachment-id${AsciiUnitSeparator}Noe gikk galt under oppdatering av filens merking, prøv igjen senere.`,
          ],
          warnings: [],
        },
      });

      const deleteValidation = getFileUploadComponentValidations('delete', mockLanguage.language);
      expect(deleteValidation).toEqual({
        simpleBinding: {
          errors: ['Noe gikk galt under slettingen av filen, prøv igjen senere.'],
          warnings: [],
        },
      });
    });
  });

  describe('parseFileUploadComponentWithTagValidationObject', () => {
    it('should return correct validation array', () => {
      const mockValidations = [
        'Noe gikk galt under opplastingen av filen, prøv igjen senere.',
        'Noe gikk galt under oppdatering av filens merking, prøv igjen senere.',
        `mock-attachment-id${AsciiUnitSeparator}Noe gikk galt under oppdatering av filens merking, prøv igjen senere.`,
        'Noe gikk galt under slettingen av filen, prøv igjen senere.',
      ];
      const expectedResult = [
        {
          id: '',
          message: 'Noe gikk galt under opplastingen av filen, prøv igjen senere.',
        },
        {
          id: '',
          message: 'Noe gikk galt under oppdatering av filens merking, prøv igjen senere.',
        },
        {
          id: 'mock-attachment-id',
          message: 'Noe gikk galt under oppdatering av filens merking, prøv igjen senere.',
        },
        {
          id: '',
          message: 'Noe gikk galt under slettingen av filen, prøv igjen senere.',
        },
      ];

      const validationArray = parseFileUploadComponentWithTagValidationObject(mockValidations);
      expect(validationArray).toEqual(expectedResult);
    });
  });

  describe('gridBreakpoints', () => {
    const defaultGrid: IGridStyling = {
      xs: 12,
    };
    it('should return default values when no params are passed', () => {
      const expected = { ...defaultGrid };
      const result = gridBreakpoints();
      expect(result).toEqual(expected);
    });

    it('should return xs value even if it is not passed', () => {
      const passValues: IGridStyling = { sm: 4, lg: 8 };
      const expected: IGridStyling = {
        ...defaultGrid,
        ...passValues,
      };
      const result = gridBreakpoints(passValues);
      expect(result).toEqual(expected);
    });

    it('should return all the sizes that are passed', () => {
      const passValues: IGridStyling = {
        xs: 1,
        sm: 2,
        md: 3,
        lg: 4,
        xl: 5,
      };
      const result = gridBreakpoints(passValues);
      expect(result).toEqual(passValues);
    });

    it('should not return sizes that not are passed, except xs', () => {
      const passValues: IGridStyling = {
        sm: 2,
        xl: 5,
      };
      const result = gridBreakpoints(passValues);
      expect(result.xs).toBe(12);
      expect(result.md).toBeUndefined();
      expect(result.lg).toBeUndefined();
    });
  });
});
