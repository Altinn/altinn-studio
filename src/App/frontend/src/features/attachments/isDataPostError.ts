import type { DataPostErrorResponse } from 'src/features/attachments';

export function isDataPostError(error: unknown): error is DataPostErrorResponse {
  return (
    typeof error === 'object' &&
    error != null &&
    !Array.isArray(error) &&
    'uploadValidationIssues' in error &&
    Array.isArray(error.uploadValidationIssues)
  );
}
