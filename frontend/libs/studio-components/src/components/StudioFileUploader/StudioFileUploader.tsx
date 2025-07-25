import React, { ReactElement, forwardRef } from 'react';
import type { InputHTMLAttributes, Ref, RefObject, FormEvent } from 'react';
import { useForwardedRef } from '@studio/hooks';
import { UploadIcon } from '@studio/icons';
import type { StudioButtonProps } from '../StudioButton';
import { StudioButton } from '../StudioButton';
import classes from './StudioFileUploader.module.css';

export type StudioFileUploaderProps = {
  uploaderButtonText?: string;
  onSubmit?: (file: File) => void;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size' | 'onSubmit'> &
  Pick<StudioButtonProps, 'variant' | 'color' | 'data-size'>;

function StudioFileUploader(
  {
    className,
    color,
    disabled,
    onSubmit,
    uploaderButtonText,
    variant = 'tertiary',
    ...rest
  }: StudioFileUploaderProps,
  ref: Ref<HTMLInputElement>,
): ReactElement {
  const internalRef = useForwardedRef(ref);

  const handleInputChange = () => {
    const file = getFile(internalRef);
    if (file) handleSubmit();
  };

  const handleSubmit = (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    onSubmit?.(getFile(internalRef));
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
        variant={variant}
      >
        {uploaderButtonText}
      </StudioButton>
    </form>
  );
}

const getFile = (fileRef: RefObject<HTMLInputElement>): File => fileRef?.current?.files?.item(0);

const resetRef = (fileRef: RefObject<HTMLInputElement>): void => {
  fileRef.current.value = '';
};

const ForwardedStudioFileUploader = forwardRef<HTMLInputElement, StudioFileUploaderProps>(
  StudioFileUploader,
);

export { ForwardedStudioFileUploader as StudioFileUploader };
