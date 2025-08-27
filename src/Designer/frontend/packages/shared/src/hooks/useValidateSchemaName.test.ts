import { DATA_MODEL_NAME_MAX_LENGTH, useValidateSchemaName } from './useValidateSchemaName';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { act, renderHook } from '@testing-library/react';

// Test data
const existingModelName = 'existingModelName';
const existingDataTypeName = 'existingDataTypeName';
const dataModelNames = [existingModelName];
const dataTypeNames = [existingDataTypeName, existingModelName];

describe('useValidateSchemaName', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should set nameError to empty string when name is valid', () => {
    const { result } = renderUseValidateSchemaName();

    act(() => {
      result.current.validateName('ValidName');
    });

    expect(result.current.nameError).toBe('');
  });

  it('should set error when name is empty', () => {
    const { result } = renderUseValidateSchemaName();

    act(() => {
      result.current.validateName('');
    });

    expect(result.current.nameError).toBe(textMock('validation_errors.required'));
  });

  it('should set error when name exceeds max length', () => {
    const longName = 'a'.repeat(DATA_MODEL_NAME_MAX_LENGTH + 1);
    const { result } = renderUseValidateSchemaName();

    act(() => {
      result.current.validateName(longName);
    });

    expect(result.current.nameError).toBe(
      textMock('validation_errors.maxLength', { number: DATA_MODEL_NAME_MAX_LENGTH }),
    );
  });

  it('should set error when data model with same name exists', () => {
    const { result } = renderUseValidateSchemaName();

    act(() => {
      result.current.validateName(existingModelName);
    });

    expect(result.current.nameError).toBe(
      textMock('schema_editor.error_model_name_exists', {
        newModelName: existingModelName,
      }),
    );
  });

  it('should set error when data model with same name exists (case-insensitive)', () => {
    const { result } = renderUseValidateSchemaName();
    const existingModelNameUpperCase = existingModelName.toUpperCase();

    act(() => {
      result.current.validateName(existingModelNameUpperCase);
    });

    expect(result.current.nameError).toBe(
      textMock('schema_editor.error_model_name_exists', {
        newModelName: existingModelNameUpperCase,
      }),
    );
  });

  it('should set error when data type in appMetadata with same name exists, when the data type is not also a data model', () => {
    const { result } = renderUseValidateSchemaName();

    act(() => {
      result.current.validateName(existingDataTypeName);
    });

    expect(result.current.nameError).toBe(textMock('schema_editor.error_data_type_name_exists'));
  });

  it('should set error when data type in appMetadata with same name exists, when the data type is not also a data model (case-insensitive)', () => {
    const { result } = renderUseValidateSchemaName();
    const existingDataTypeNameUpperCase = existingDataTypeName.toUpperCase();

    act(() => {
      result.current.validateName(existingDataTypeNameUpperCase);
    });

    expect(result.current.nameError).toBe(textMock('schema_editor.error_data_type_name_exists'));
  });

  it('should set error when name is a C# reserved keyword', () => {
    const { result } = renderUseValidateSchemaName();

    act(() => {
      result.current.validateName('class');
    });

    expect(result.current.nameError).toBe(textMock('schema_editor.error_reserved_keyword'));
  });

  describe('regular expressions', () => {
    it('should disallow numbers and underscore at start of name', () => {
      const { result } = renderUseValidateSchemaName();
      const invalidFirstCharacters = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '_'];

      invalidFirstCharacters.forEach((char) => {
        act(() => {
          result.current.validateName(char);
        });

        expect(result.current.nameError).toBe(
          textMock('schema_editor.error_invalid_datamodel_name'),
        );
      });
    });

    it('should allow numbers and underscore in rest of name', () => {
      const { result } = renderUseValidateSchemaName();

      act(() => {
        result.current.validateName('a1234567890_');
      });

      expect(result.current.nameError).toBe('');
    });

    it('should disallow hyphens, spaces and periods anywhere in name', () => {
      const { result } = renderUseValidateSchemaName();
      const invalidNames = ['-', ' ', '.', 'a-', 'a ', 'a.', 'a-b', 'a b', 'a.b'];

      invalidNames.forEach((name) => {
        act(() => {
          result.current.validateName(name);
        });

        expect(result.current.nameError).toBe(
          textMock('schema_editor.error_invalid_datamodel_name'),
        );
      });
    });

    it('should disallow Norwegian special characters anywhere in name', () => {
      const { result } = renderUseValidateSchemaName();
      const invalidNames = [
        'æ',
        'ø',
        'å',
        'Æ',
        'Ø',
        'Å',
        'aæ',
        'aø',
        'aå',
        'aÆ',
        'aØ',
        'aÅ',
        'æa',
        'øa',
        'åa',
        'Æa',
        'Øa',
        'Åa',
        'aæb',
        'aøb',
        'aåb',
        'aÆb',
        'aØb',
        'aÅb',
      ];

      invalidNames.forEach((name) => {
        act(() => {
          result.current.validateName(name);
        });

        expect(result.current.nameError).toBe(
          textMock('schema_editor.error_invalid_datamodel_name'),
        );
      });
    });
  });
});

const renderUseValidateSchemaName = () => {
  return renderHook(() => useValidateSchemaName(dataModelNames, dataTypeNames));
};
