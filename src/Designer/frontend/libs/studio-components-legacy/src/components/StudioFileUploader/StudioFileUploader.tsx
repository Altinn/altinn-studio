import type { InputHTMLAttributes, RefObject } from 'react';
import React, { forwardRef } from 'react';
import classes from './StudioFileUploader.module.css';
import { UploadIcon } from '../../../../studio-icons';
import type { StudioButtonProps } from '../StudioButton';
import { StudioButton } from '../StudioButton';
import { useForwardedRef } from '@studio/hooks';

export type StudioFileUploaderProps = {
  uploaderButtonText?: string;
  onSubmit?: (file: File) => void;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size' | 'onSubmit'> &
  Pick<StudioButtonProps, 'size' | 'variant' | 'color'>;

/**
 * @deprecated use `StudioFileUploader` from `@studio/components` instead
 */
export const StudioFileUploader = forwardRef<HTMLInputElement, StudioFileUploaderProps>(
  (
    {
      className,
      color,
      disabled,
      onSubmit,
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
      if (file) {
        onSubmit?.(file);
      }
      resetRef(internalRef);
    };

    const handleButtonClick = () => {
      internalRef.current?.click();
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
          onClick={handleButtonClick}
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

const resetRef = (fileRef: RefObject<HTMLInputElement>): void => {
  fileRef.current.value = '';
};
