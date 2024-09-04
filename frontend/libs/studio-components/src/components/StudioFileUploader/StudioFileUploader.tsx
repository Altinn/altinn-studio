import type { RefObject } from 'react';
import React, { forwardRef } from 'react';
import classes from './StudioFileUploader.module.css';
import { UploadIcon } from '@studio/icons';
import type { StudioButtonProps } from '../StudioButton';
import { StudioButton } from '../StudioButton';

type StudioFileUploaderProps = {
  onUploadFile: (file: FormData, fileName: string) => void;
  accept?: string;
  size?: StudioButtonProps['size'];
  variant?: StudioButtonProps['variant'];
  disabled?: boolean;
  uploaderButtonText?: string;
  fileNameRegEx?: RegExp;
  onInvalidFileName?: () => void;
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
      fileNameRegEx,
      onInvalidFileName,
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
      if (isFileNameValid(file, fileNameRegEx, ref, onInvalidFileName)) {
        const formData = new FormData();
        formData.append('file', file); // Pass the fileName as a prop or at least use a global (studio-) constant if it exists?
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

const isFileNameValid = (
  file: File,
  fileNameRegEx: RegExp,
  fileRef: RefObject<HTMLInputElement>,
  onInvalidFileName: () => void,
): boolean => {
  if (!file) return false;
  const handleFileNameError = !!fileNameRegEx && !!onInvalidFileName;
  if (!handleFileNameError) return true;
  if (!file.name.match(fileNameRegEx)) {
    onInvalidFileName();
    fileRef.current.value = '';
    return false;
  }
  return true;
};
