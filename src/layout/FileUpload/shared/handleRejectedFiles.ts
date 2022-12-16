import type { FileRejection } from 'react-dropzone';

import { getLanguageFromKey } from 'src/utils/sharedUtils';
import type { ILanguage } from 'src/types/shared';

const bytesInOneMB = 1048576;

interface Args {
  language: ILanguage;
  rejectedFiles: FileRejection[];
  maxFileSizeInMB: number;
}

export function handleRejectedFiles({ language, rejectedFiles, maxFileSizeInMB }: Args) {
  return rejectedFiles.length > 0
    ? rejectedFiles.map((fileRejection) => {
        if (fileRejection.file.size > maxFileSizeInMB * bytesInOneMB) {
          return `${fileRejection.file.name} ${getLanguageFromKey(
            'form_filler.file_uploader_validation_error_file_size',
            language,
          )}`;
        } else {
          return `${getLanguageFromKey('form_filler.file_uploader_validation_error_general_1', language)} ${
            fileRejection.file.name
          } ${getLanguageFromKey('form_filler.file_uploader_validation_error_general_2', language)}`;
        }
      })
    : [];
}
