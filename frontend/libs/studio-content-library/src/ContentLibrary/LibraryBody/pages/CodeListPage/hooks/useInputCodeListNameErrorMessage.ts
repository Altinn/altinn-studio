import type { FileNameErrorResult } from '@studio/pure-functions';
import { useCodeListNameErrorMessages } from './useCodeListNameErrorMessages';

export function useInputCodeListNameErrorMessage(): (fileNameError: FileNameErrorResult) => string {
  const errorMessages = useCodeListNameErrorMessages({ isNameFromUpload: false });
  return (fileNameError: FileNameErrorResult): string => errorMessages[fileNameError];
}
