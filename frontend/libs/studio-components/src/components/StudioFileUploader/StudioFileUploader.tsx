import type { RefObject } from 'react';
import React, { forwardRef } from 'react';
import classes from './StudioFileUploader.module.css';
import { UploadIcon } from '@studio/icons';
import type { StudioButtonProps } from '../StudioButton';
import { StudioButton } from '../StudioButton';

const NUMBER_BITS_IN_A_BYTE = 1024;
export const BITS_IN_A_MEGA_BYTE = NUMBER_BITS_IN_A_BYTE * NUMBER_BITS_IN_A_BYTE;

export type FileValidation = {
  validateFileName?: (fileName: string) => boolean;
  fileSizeLimitMb?: number;
  onInvalidFileName?: (file?: FormData, fileName?: string) => void;
  onInvalidFileSize?: () => void;
};

export type StudioFileUploaderProps = {
  onUploadFile: (file: FormData, fileName: string) => void;
  accept?: string;
  size?: StudioButtonProps['size'];
  variant?: StudioButtonProps['variant'];
  disabled?: boolean;
  uploaderButtonText?: string;
  customFileValidation?: FileValidation;
  dataTestId?: string;
};

/**
 * @component
 *    Component for uploading a file from a studio button and show spinner during uploading
 */
export const StudioFileUploader = forwardRef<HTMLElement, StudioFileUploaderProps>(
  (
    {
      onUploadFile,
      accept,
      size,
      variant = 'tertiary',
      disabled,
      uploaderButtonText,
      customFileValidation,
      dataTestId,
    },
    ref: RefObject<HTMLInputElement>,
  ): React.ReactElement => {
    const handleInputChange = () => {
      const file = getFile(ref);
      if (file) handleSubmit();
    };

    const handleSubmit = (event?: React.FormEvent<HTMLFormElement>) => {
      event?.preventDefault();
      const file = getFile(ref);
      if (isFileValid(file, ref, customFileValidation)) {
        const formData = new FormData();
        formData.append('file', file);
        onUploadFile(formData, file.name);
      }
    };

    return (
      <form onSubmit={handleSubmit}>
        <input
          data-testid={dataTestId}
          type='file'
          accept={accept}
          ref={ref}
          disabled={disabled}
          onChange={handleInputChange}
          className={classes.fileInput}
        />
        <StudioButton
          size={size}
          icon={<UploadIcon />}
          onClick={() => ref?.current?.click()}
          disabled={disabled}
          variant={variant}
        >
          {uploaderButtonText}
        </StudioButton>
      </form>
    );
  },
);

StudioFileUploader.displayName = 'StudioFileUploader';

const getFile = (fileRef: RefObject<HTMLInputElement>): File => fileRef?.current?.files?.item(0);

const isFileValid = (
  file: File,
  fileRef: RefObject<HTMLInputElement>,
  customFileValidation: FileValidation,
): boolean => {
  if (!file) return false;
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
    file.size > customFileValidation.fileSizeLimitMb * BITS_IN_A_MEGA_BYTE
  ) {
    customFileValidation.onInvalidFileSize();
    fileRef.current.value = '';
    return false;
  }
  return true;
};
