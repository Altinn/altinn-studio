export type SyncSuccess = {
  source: Source;
};

export type SyncError = {
  errorCode: ErrorCode;
  source: Source;
  details: string;
};

type Source = {
  name: string;
  path: string;
};

export type ErrorCode =
  | 'applicationMetadataTaskIdSyncError'
  | 'layoutSetsTaskIdSyncError'
  | 'policyFileTaskIdSyncError'
  | 'applicationMetadataDataTypeSyncError'
  | 'layoutSetsDataTypeSyncError'
  | 'settingsComponentIdSyncError'
  | 'layoutSetComponentIdSyncError';
