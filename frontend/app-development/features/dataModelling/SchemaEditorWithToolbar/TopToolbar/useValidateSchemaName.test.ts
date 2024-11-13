import { SCHEMA_NAME_MAX_LENGTH, useValidateSchemaName } from './useValidateSchemaName';
import { useAppMetadataQuery } from 'app-shared/hooks/queries';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import type { DataModelMetadata } from 'app-shared/types/DataModelMetadata';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { renderHook, act } from '@testing-library/react';
import {
  dataModel1NameMock,
  jsonMetadata1Mock,
} from '../../../../../packages/schema-editor/test/mocks/metadataMocks';
import type { ApplicationMetadata } from 'app-shared/types/ApplicationMetadata';
import { mockAppMetadata } from '../../../../layout/PageHeader/SubHeader/SettingsModalButton/SettingsModal/mocks/applicationMetadataMock';

//Test data
const org = 'test-org';
const app = 'test-app';
const dataModels: DataModelMetadata[] = [jsonMetadata1Mock];
const appMetaData: ApplicationMetadata = mockAppMetadata;

jest.mock('app-shared/hooks/queries', () => ({
  useAppMetadataQuery: jest.fn(),
}));

jest.mock('app-shared/hooks/useStudioEnvironmentParams', () => ({
  useStudioEnvironmentParams: jest.fn(),
}));

describe('useValidateSchemaName', () => {
  beforeEach(() => {
    (useStudioEnvironmentParams as jest.Mock).mockReturnValue({ org, app });
    (useAppMetadataQuery as jest.Mock).mockReturnValue({ data: appMetaData });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should set nameError to empty string when name is valid', () => {
    const { result } = renderHook(() => useValidateSchemaName(dataModels));

    result.current.validateName('ValidName');

    expect(result.current.nameError).toBe('');
  });

  it('should set error when name is empty', () => {
    const { result } = renderHook(() => useValidateSchemaName(dataModels));

    act(() => {
      result.current.validateName('');
    });

    expect(result.current.nameError).toBe(textMock('validation_errors.required'));
  });

  it('should set error when name does not match regex', () => {
    const { result } = renderHook(() => useValidateSchemaName(dataModels));

    act(() => {
      result.current.validateName('123InvalidName');
    });

    expect(result.current.nameError).toBe(textMock('schema_editor.error_invalid_datamodel_name'));
  });

  it('should set error when name exceeds max length', () => {
    const longName = 'a'.repeat(SCHEMA_NAME_MAX_LENGTH + 1);
    const { result } = renderHook(() => useValidateSchemaName(dataModels));

    act(() => {
      result.current.validateName(longName);
    });

    expect(result.current.nameError).toBe(
      textMock('validation_errors.maxLength', { 0: SCHEMA_NAME_MAX_LENGTH }),
    );
  });

  it('should set error when name exists in dataModels', () => {
    const { result } = renderHook(() => useValidateSchemaName(dataModels));

    act(() => {
      result.current.validateName(dataModel1NameMock);
    });

    expect(result.current.nameError).toBe(
      textMock('schema_editor.error_model_name_exists', {
        newModelName: dataModel1NameMock,
      }),
    );
  });

  it('should set error when name exists in dataTypes', () => {
    const { result } = renderHook(() => useValidateSchemaName(dataModels));

    act(() => {
      result.current.validateName('dataTypeId');
    });

    expect(result.current.nameError).toBe(textMock('schema_editor.error_data_type_name_exists'));
  });

  it('should set error when name is a C# reserved keyword', () => {
    const { result } = renderHook(() => useValidateSchemaName(dataModels));

    act(() => {
      result.current.validateName('class');
    });

    expect(result.current.nameError).toBe(textMock('schema_editor.error_reserved_keyword'));
  });

  it('should handle norwegian characters in name', () => {
    const { result } = renderHook(() => useValidateSchemaName(dataModels));

    result.current.validateName('Valid_Name-æøåÆØÅ');

    expect(result.current.nameError).toBe('');
  });
});
