import React, { type RefObject, useRef } from 'react';
import { StudioFileUploader } from '@studio/components-legacy';
import type { StudioFileUploaderProps } from '@studio/components-legacy';

export type FileValidation = {
  validateFileName?: (fileName: string) => boolean;
  fileSizeLimitMb?: number;
  onInvalidFileName?: (file?: FormData, fileName?: string) => void;
  onInvalidFileSize?: () => void;
};

export type FileUploaderWithValidationProps = StudioFileUploaderProps & {
  onUploadFile: (file: FormData, fileName: string) => void;
  customFileValidation?: FileValidation;
};

export function FileUploaderWithValidation({
  customFileValidation,
  onUploadFile,
  ...rest
}: FileUploaderWithValidationProps) {
  const ref = useRef<HTMLInputElement>(null);

  const handleSubmit = (file: File) => {
    if (isFileValid(file, ref, customFileValidation)) {
      const formData = new FormData();
      formData.append('file', file);
      onUploadFile(formData, file.name);
    }
  };

  return <StudioFileUploader {...rest} onSubmit={handleSubmit} ref={ref} />;
}

const isFileValid = (
  file: File,
  fileRef: RefObject<HTMLInputElement>,
  customFileValidation: FileValidation,
): boolean => {
  if (!customFileValidation) return true;
  if (customFileValidation.validateFileName && !customFileValidation.validateFileName(file.name)) {
    const formData = new FormData();
    formData.append('file', file);
    customFileValidation.onInvalidFileName(formData, file.name);
    fileRef.current.value = '';
    return false;
  }
  if (
    customFileValidation.fileSizeLimitMb &&
    file.size > customFileValidation.fileSizeLimitMb * BYTES_IN_A_MEGA_BYTE
  ) {
    customFileValidation.onInvalidFileSize();
    fileRef.current.value = '';
    return false;
  }
  return true;
};

const BYTES_IN_A_KILO_BYTE = 1024;
const KILO_BYTES_IN_A_MEGA_BYTE = 1024;
export const BYTES_IN_A_MEGA_BYTE = KILO_BYTES_IN_A_MEGA_BYTE * BYTES_IN_A_KILO_BYTE;
