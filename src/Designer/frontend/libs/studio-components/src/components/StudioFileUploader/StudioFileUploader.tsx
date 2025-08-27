import React, { forwardRef, useRef, useImperativeHandle } from 'react';
import type { InputHTMLAttributes, ReactElement, Ref, RefObject, FormEvent } from 'react';
import { UploadIcon } from '../../../../studio-icons';
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
    'data-size': dataSize,
    disabled,
    onSubmit,
    uploaderButtonText,
    variant = 'tertiary',
    ...rest
  }: StudioFileUploaderProps,
  ref: Ref<HTMLInputElement>,
): ReactElement {
  const internalRef = useRef<HTMLInputElement>(null);
  useImperativeHandle(ref, () => internalRef.current!);

  const handleInputChange = (): void => {
    const file = getFile(internalRef);
    if (file) handleSubmit();
  };

  const handleSubmit = (event?: FormEvent<HTMLFormElement>): void => {
    event?.preventDefault();
    const file = getFile(internalRef);
    if (file) {
      onSubmit?.(file);
    }
    resetRef(internalRef);
  };

  const handleButtonClick = (): void => {
    if (internalRef.current) {
      internalRef.current.click();
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
        data-size={dataSize}
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

const getFile = (fileRef: RefObject<HTMLInputElement>): File | null | undefined => {
  return fileRef?.current?.files?.item(0);
};

const resetRef = (fileRef: RefObject<HTMLInputElement>): void => {
  if (fileRef.current) {
    fileRef.current.value = '';
  }
};

const ForwardedStudioFileUploader = forwardRef<HTMLInputElement, StudioFileUploaderProps>(
  StudioFileUploader,
);

export { ForwardedStudioFileUploader as StudioFileUploader };
