import { type ErrorCode, type SyncError, SyncUtils } from './SyncUtils';

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
