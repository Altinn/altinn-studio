import type { InputHTMLAttributes, RefObject } from 'react';
import React, { forwardRef } from 'react';
import classes from './StudioFileUploader.module.css';
import { UploadIcon } from '@studio/icons';
import type { StudioButtonProps } from '../StudioButton';
import { StudioButton } from '../StudioButton';
import { useForwardedRef } from '@studio/hooks';

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
  uploaderButtonText?: string;
  customFileValidation?: FileValidation;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> &
  Pick<StudioButtonProps, 'size' | 'variant' | 'color'>;

export const StudioFileUploader = forwardRef<HTMLInputElement, StudioFileUploaderProps>(
  (
    {
      className,
      color,
      customFileValidation,
      disabled,
      onUploadFile,
      size,
      uploaderButtonText,
      variant = 'tertiary',
      ...rest
    },
    ref,
  ): React.ReactElement => {
    const internalRef = useForwardedRef(ref);

    const handleInputChange = () => {
      const file = getFile(internalRef);
      if (file) handleSubmit();
    };

    const handleSubmit = (event?: React.FormEvent<HTMLFormElement>) => {
      event?.preventDefault();
      const file = getFile(internalRef);
      if (isFileValid(file, internalRef, customFileValidation)) {
        const formData = new FormData();
        formData.append('file', file);
        onUploadFile(formData, file.name);
      }
    };

    return (
      <form onSubmit={handleSubmit} className={className}>
        <input
          aria-label={uploaderButtonText}
          className={classes.fileInput}
          disabled={disabled}
          onChange={handleInputChange}
          ref={internalRef}
          type='file'
          {...rest}
        />
        <StudioButton
          color={color}
          disabled={disabled}
          icon={<UploadIcon />}
          onClick={() => internalRef?.current?.click()}
          size={size}
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
