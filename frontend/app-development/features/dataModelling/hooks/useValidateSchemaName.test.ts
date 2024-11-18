import { SCHEMA_NAME_MAX_LENGTH, useValidateSchemaName } from './useValidateSchemaName';
import type { DataModelMetadata } from 'app-shared/types/DataModelMetadata';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { act } from '@testing-library/react';
import {
  dataModel1NameMock,
  jsonMetadata1Mock,
} from '../../../../packages/schema-editor/test/mocks/metadataMocks';
import { mockAppMetadata, mockDataTypes } from '../../../test/applicationMetadataMock';
import { renderHookWithProviders } from '../../../test/mocks';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { app, org } from '@studio/testing/testids';

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
    const longName = 'a'.repeat(SCHEMA_NAME_MAX_LENGTH + 1);
    const { result } = renderUseValidateSchemaName();

    act(() => {
      result.current.validateName(longName);
    });

    expect(result.current.nameError).toBe(
      textMock('validation_errors.maxLength', { number: SCHEMA_NAME_MAX_LENGTH }),
    );
  });

  it('should set error when data model with same name exists', () => {
    const { result } = renderUseValidateSchemaName();

    act(() => {
      result.current.validateName(dataModel1NameMock);
    });

    expect(result.current.nameError).toBe(
      textMock('schema_editor.error_model_name_exists', {
        newModelName: dataModel1NameMock,
      }),
    );
  });

  it('should set error when data type in appMetadata with same name exists', () => {
    const { result } = renderUseValidateSchemaName();

    act(() => {
      result.current.validateName(mockDataTypes[0].id);
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
    it('should disallow Norwegian characters at start of name', () => {
      const { result } = renderUseValidateSchemaName();
      const invalidFirstCharacters = ['æ', 'ø', 'å', 'Æ', 'Ø', 'Å'];

      invalidFirstCharacters.forEach((char) => {
        act(() => {
          result.current.validateName(char);
        });

        expect(result.current.nameError).toBe(
          textMock('schema_editor.error_invalid_datamodel_name'),
        );
      });
    });

    it('should allow Norwegian characters in rest of name', () => {
      const { result } = renderUseValidateSchemaName();

      act(() => {
        result.current.validateName('aÆØÅæøå');
      });

      expect(result.current.nameError).toBe('');
    });

    it('should disallow numbers at start of name', () => {
      const { result } = renderUseValidateSchemaName();
      const invalidFirstCharacters = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

      invalidFirstCharacters.forEach((char) => {
        act(() => {
          result.current.validateName(char);
        });

        expect(result.current.nameError).toBe(
          textMock('schema_editor.error_invalid_datamodel_name'),
        );
      });
    });

    it('should allow numbers in rest of name', () => {
      const { result } = renderUseValidateSchemaName();

      act(() => {
        result.current.validateName('a1234567890');
      });

      expect(result.current.nameError).toBe('');
    });

    it('should disallow "-" and "_" at start of name', () => {
      const { result } = renderUseValidateSchemaName();
      const invalidFirstCharacters = ['-', '_', 'æ', 'ø', 'å', 'Æ', 'Ø', 'Å'];

      invalidFirstCharacters.forEach((char) => {
        act(() => {
          result.current.validateName(char);
        });

        expect(result.current.nameError).toBe(
          textMock('schema_editor.error_invalid_datamodel_name'),
        );
      });
    });

    it('should allow "-" and "_" in rest of name', () => {
      const { result } = renderUseValidateSchemaName();

      act(() => {
        result.current.validateName('a-_');
      });

      expect(result.current.nameError).toBe('');
    });
  });
});

const renderUseValidateSchemaName = () => {
  const dataModels: DataModelMetadata[] = [jsonMetadata1Mock];

  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.AppMetadata, org, app], mockAppMetadata);
  const { renderHookResult: result } = renderHookWithProviders(
    {},
    queryClient,
  )(() => useValidateSchemaName(dataModels));

  return result;
};
