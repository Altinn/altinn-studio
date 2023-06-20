import type { FileRejection } from 'react-dropzone';

import type { IUseLanguage } from 'src/hooks/useLanguage';

const bytesInOneMB = 1048576;

interface Args {
  langTools: IUseLanguage;
  rejectedFiles: FileRejection[];
  maxFileSizeInMB: number;
}

export function handleRejectedFiles({ langTools, rejectedFiles, maxFileSizeInMB }: Args): string[] {
  const { langAsString } = langTools;
  return rejectedFiles.length > 0
    ? rejectedFiles.map((fileRejection) => {
        if (fileRejection.file.size > maxFileSizeInMB * bytesInOneMB) {
          return `${fileRejection.file.name} ${langAsString('form_filler.file_uploader_validation_error_file_size')}`;
        } else {
          return `${langAsString('form_filler.file_uploader_validation_error_general_1')} ${
            fileRejection.file.name
          } ${langAsString('form_filler.file_uploader_validation_error_general_2')}`;
        }
      })
    : [];
}
