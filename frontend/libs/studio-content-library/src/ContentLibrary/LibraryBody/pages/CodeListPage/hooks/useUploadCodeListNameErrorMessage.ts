import type { FileNameErrorResult } from '@studio/pure-functions';
import { useCodeListNameErrorMessages } from './useCodeListNameErrorMessages';

export function useUploadCodeListNameErrorMessage(): (
  fileNameError: FileNameErrorResult,
) => string {
  const errorMessages = useCodeListNameErrorMessages({ isNameFromUpload: true });
  return (fileNameError: FileNameErrorResult): string => errorMessages[fileNameError];
}
