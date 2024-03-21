export type SyncSuccess = {
  source: {
    name: string;
    path: string;
  };
};

export type ErrorCode =
  | 'applicationMetadataTaskIdSyncError'
  | 'layoutSetsTaskIdSyncError'
  | 'policyFileTaskIdSyncError';

export type SyncError = {
  errorCode: ErrorCode;
  source: {
    name: string;
    path: string;
  };
  details: string;
};

export class SyncUtils {
  private static readonly errorCodeMap: Record<ErrorCode, string> = {
    applicationMetadataTaskIdSyncError: 'process_editor.sync_error_application_metadata_task_id',
    layoutSetsTaskIdSyncError: 'process_editor.sync_error_layout_sets_task_id',
    policyFileTaskIdSyncError: 'process_editor.sync_error_policy_file_task_id',
  };

  public static getSyncErrorMessage(error: SyncError): string {
    return this.errorCodeMap[error.errorCode] || 'process_editor.sync_error.unknown_error';
  }
}
