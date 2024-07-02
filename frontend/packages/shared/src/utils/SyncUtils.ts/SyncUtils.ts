import type { ErrorCode, SyncError } from 'app-shared/types/api/SyncResponses';

export class SyncUtils {
  private static readonly errorCodeMap: Record<ErrorCode, string> = {
    applicationMetadataTaskIdSyncError: 'process_editor.sync_error_application_metadata_task_id',
    layoutSetsTaskIdSyncError: 'process_editor.sync_error_layout_sets_task_id',
    policyFileTaskIdSyncError: 'process_editor.sync_error_policy_file_task_id',
    applicationMetadataDataTypeSyncError:
      'process_editor.sync_error_application_metadata_data_type',
    layoutSetsDataTypeSyncError: 'process_editor.sync_error_layout_sets_data_type',
    layoutSetComponentIdSyncError: 'ux_editor.sync_error_layout_set_component_id',
    settingsComponentIdSyncError: 'ux_editor.sync_error_settings_component_id',
  };

  public static getSyncErrorMessage(error: SyncError): string {
    return this.errorCodeMap[error.errorCode] || 'process_editor.sync_error.unknown_error';
  }
}
