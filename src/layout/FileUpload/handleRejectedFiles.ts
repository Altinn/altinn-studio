import type { FileRejection } from 'react-dropzone';

import type { IUseLanguage } from 'src/features/language/useLanguage';

const bytesInOneMB = 1048576;

interface Args {
  langTools: IUseLanguage;
  rejectedFiles: FileRejection[];
  maxFileSizeInMB: number;
}

export function handleRejectedFiles({ langTools, rejectedFiles, maxFileSizeInMB }: Args): string[] | undefined {
  const { langAsString } = langTools;
  return rejectedFiles.length > 0
    ? rejectedFiles.map((fileRejection) => {
        if (fileRejection.file.size > maxFileSizeInMB * bytesInOneMB) {
          return langAsString('form_filler.file_uploader_validation_error_file_size', [fileRejection.file.name]);
        } else {
          return langAsString('form_filler.file_uploader_validation_error_general', [fileRejection.file.name]);
        }
      })
    : undefined;
}
