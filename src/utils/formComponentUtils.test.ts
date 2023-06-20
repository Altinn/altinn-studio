import { staticUseLanguageForTests } from 'src/hooks/useLanguage';
import { AsciiUnitSeparator } from 'src/utils/attachment';
import {
  atleastOneTagExists,
  getColumnStyles,
  getColumnStylesRepeatingGroups,
  getFieldName,
  getFileUploadComponentValidations,
  gridBreakpoints,
  isAttachmentError,
  isNotAttachmentError,
  parseFileUploadComponentWithTagValidationObject,
  smartLowerCaseFirst,
} from 'src/utils/formComponentUtils';
import type { IAttachment, IAttachments } from 'src/features/attachments';
import type { IGridStyling, ITableColumnFormatting, ITableColumnProperties } from 'src/layout/layout';
import type { AnyItem } from 'src/utils/layout/hierarchy.types';

describe('formComponentUtils', () => {
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
    const mockLangTools = staticUseLanguageForTests({ textResources, language: mockLanguage });

    it('should return field text from languages when fieldKey is present', () => {
      const result = getFieldName({ title: 'title' }, mockLangTools, 'address');
      expect(result).toEqual('gateadresse');
    });

    it('should return component shortName (textResourceBindings) when no fieldKey is present', () => {
      const result = getFieldName({ title: 'title', shortName: 'short' }, mockLangTools);
      expect(result).toEqual('name');
    });

    it('should return component title (textResourceBindings) when no shortName (textResourceBindings) and no fieldKey is present', () => {
      const result = getFieldName({ title: 'title' }, mockLangTools);
      expect(result).toEqual('component name');
    });

    it('should return generic field name when fieldKey, shortName and title are all not available', () => {
      const result = getFieldName({ something: 'someTextKey' }, mockLangTools);
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
      { input: undefined, expected: undefined },
      { input: '', expected: '' },
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
      const langTools = staticUseLanguageForTests({ language: mockLanguage.language });

      const uploadValidation = getFileUploadComponentValidations('upload', langTools);
      expect(uploadValidation).toEqual({
        simpleBinding: {
          errors: ['Noe gikk galt under opplastingen av filen, prøv igjen senere.'],
          warnings: [],
        },
      });

      const updateValidation = getFileUploadComponentValidations('update', langTools);
      expect(updateValidation).toEqual({
        simpleBinding: {
          errors: ['Noe gikk galt under oppdatering av filens merking, prøv igjen senere.'],
          warnings: [],
        },
      });

      const updateValidationWithId = getFileUploadComponentValidations('update', langTools, 'mock-attachment-id');
      expect(updateValidationWithId).toEqual({
        simpleBinding: {
          errors: [
            `mock-attachment-id${AsciiUnitSeparator}Noe gikk galt under oppdatering av filens merking, prøv igjen senere.`,
          ],
          warnings: [],
        },
      });

      const deleteValidation = getFileUploadComponentValidations('delete', langTools);
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
  describe('getColumnStylesRepeatingGroups', () => {
    it('should return undefined if columnSettings does not contain specified baseComponentId', () => {
      const tableItem = { baseComponentId: 'headerName1' } as AnyItem;
      const columnSettings = { headerName2: { width: '100px' } };
      expect(getColumnStylesRepeatingGroups(tableItem, columnSettings)).toBeUndefined();
    });

    it('should set textAlignment to alignText property of columnSettings if present', () => {
      const tableItem = { baseComponentId: 'headerName1' } as AnyItem;
      const columnSettings: ITableColumnFormatting = { headerName1: { width: '100px', alignText: 'center' } };
      const columnStyles = getColumnStylesRepeatingGroups(tableItem, columnSettings);
      expect(columnStyles).toEqual({
        '--cell-max-number-of-lines': 2,
        '--cell-text-alignment': 'center',
        '--cell-width': '100px',
      });
    });

    it('should set textAlignment to getTextAlignment(tableHeader) if alignText is not present in columnSettings', () => {
      const tableItem: AnyItem = {
        baseComponentId: 'headerName1',
        id: 'headerName1',
        type: 'Input',
        formatting: { number: {} },
      };
      const columnSettings: ITableColumnFormatting = { headerName1: { width: '100px' } };
      const columnStyles = getColumnStylesRepeatingGroups(tableItem, columnSettings);
      expect(columnStyles).toEqual({
        '--cell-max-number-of-lines': 2,
        '--cell-text-alignment': 'right',
        '--cell-width': '100px',
      });
    });

    it('should return columnStyles object if columnSettings is provided and contains specified baseComponentId', () => {
      const tableItem = { baseComponentId: 'headerName1' } as AnyItem;
      const columnSettings: ITableColumnFormatting = { headerName1: { width: '100px' } };
      const columnStyles = getColumnStylesRepeatingGroups(tableItem, columnSettings);
      expect(columnStyles).toBeDefined();
    });
  });

  describe('getColumnStyles', () => {
    it('should return CSS properties object with correct values based on columnSettings', () => {
      const columnSettings: ITableColumnProperties = {
        width: '100px',
        textOverflow: { lineWrap: true, maxHeight: 3 },
        alignText: 'center',
      };
      const columnStyles = getColumnStyles(columnSettings);
      expect(columnStyles).toEqual({
        '--cell-max-number-of-lines': 3,
        '--cell-text-alignment': 'center',
        '--cell-width': '100px',
      });
    });

    it('should return CSS properties object with default value for "--cell-max-number-of-lines" if lineWrap is false', () => {
      const columnSettings: ITableColumnProperties = {
        width: '100px',
        textOverflow: { lineWrap: false, maxHeight: 3 },
        alignText: 'center',
      };
      const columnStyles = getColumnStyles(columnSettings);
      expect(columnStyles['--cell-max-number-of-lines']).toEqual(0);
    });
  });
});
