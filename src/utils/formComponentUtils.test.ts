import parseHtmlToReact from 'html-react-parser';

import { parseOptions } from 'src/language/sharedLanguage';
import { AsciiUnitSeparator } from 'src/utils/attachment';
import {
  atleastOneTagExists,
  getFieldName,
  getFileUploadComponentValidations,
  gridBreakpoints,
  isAttachmentError,
  isNotAttachmentError,
  parseFileUploadComponentWithTagValidationObject,
  selectComponentTexts,
  smartLowerCaseFirst,
} from 'src/utils/formComponentUtils';
import type { IAttachment, IAttachments } from 'src/features/attachments';
import type { IGridStyling } from 'src/layout/layout';
import type { ITextResource } from 'src/types';

describe('formComponentUtils', () => {
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
