import { SyncUtils } from './SyncUtils';
import type { ErrorCode, SyncError } from 'app-shared/types/api/SyncResponses';

const defaultSyncErrorMock: SyncError = {
  errorCode: 'applicationMetadataTaskIdSyncError',
  source: {
    name: '',
    path: '',
  },
  details: '',
};

describe('SyncUtils', () => {
  it.each([
    {
      code: 'applicationMetadataTaskIdSyncError',
      expectedTranslationKey: 'process_editor.sync_error_application_metadata_task_id',
    },
    {
      code: 'layoutSetsTaskIdSyncError',
      expectedTranslationKey: 'process_editor.sync_error_layout_sets_task_id',
    },
    {
      code: 'policyFileTaskIdSyncError',
      expectedTranslationKey: 'process_editor.sync_error_policy_file_task_id',
    },
    {
      code: 'applicationMetadataDataTypeSyncError',
      expectedTranslationKey: 'process_editor.sync_error_application_metadata_data_type',
    },
    {
      code: 'layoutSetsDataTypeSyncError',
      expectedTranslationKey: 'process_editor.sync_error_layout_sets_data_type',
    },
    {
      code: 'layoutSetComponentIdSyncError',
      expectedTranslationKey: 'ux_editor.sync_error_layout_set_component_id',
    },
    {
      code: 'settingsComponentIdSyncError',
      expectedTranslationKey: 'ux_editor.sync_error_settings_component_id',
    },
  ])(`should map errorCode into translation keys`, ({ code, expectedTranslationKey }) => {
    const syncError: SyncError = {
      ...defaultSyncErrorMock,
      errorCode: code as ErrorCode,
    };

    const translationKey = SyncUtils.getSyncErrorMessage(syncError);
    expect(translationKey).toBe(expectedTranslationKey);
  });

  it('should return unknown error if error code is not known by the frontend', () => {
    const syncError: SyncError = {
      ...defaultSyncErrorMock,
      errorCode: 'newCodeThatDoesNotExistInFrontend' as ErrorCode,
    };

    const translationKey = SyncUtils.getSyncErrorMessage(syncError);
    expect(translationKey).toBe('process_editor.sync_error.unknown_error');
  });
});
