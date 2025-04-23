import React, { useRef } from 'react';
import type { ChangeEvent, InputHTMLAttributes, ReactElement, ReactNode } from 'react';
import { Dropdown } from '@digdir/designsystemet-react';
import type { DropdownButtonProps } from '@digdir/designsystemet-react';
import type { IconPlacement } from '../../../types/IconPlacement';
import classes from './StudioDropdownFileUploaderButton.module.css';
import { useStudioDropdownContext } from '../context/StudioDropdownContext';
import { TextWithIcon } from '../../TextWithIcon';

type FileInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>;

export type StudioDropdownFileUploaderButtonProps = {
  icon?: ReactNode;
  iconPlacement?: IconPlacement;
  onFileUpload?: (file: File) => void;
  fileInputProps?: FileInputProps;
  uploadButtonText?: string;
} & Omit<DropdownButtonProps, 'icon'>;

export function StudioDropdownFileUploaderButton({
  icon,
  iconPlacement = 'left',
  onFileUpload,
  fileInputProps,
  uploadButtonText,
  disabled,
  ...rest
}: StudioDropdownFileUploaderButtonProps): ReactElement {
  const { setOpen } = useStudioDropdownContext();
  const inputRef = useRef<HTMLInputElement>(null);

  const isFileInputDisabled: boolean = fileInputProps?.disabled ?? disabled ?? false;

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    if (file) {
      onFileUpload?.(file);
      setOpen(false);
    }
  };

  const handleClick = (): void => {
    inputRef.current?.click();
  };

  return (
    <>
      <Dropdown.Button {...rest} onClick={handleClick} disabled={isFileInputDisabled}>
        <TextWithIcon icon={icon} iconPlacement={iconPlacement}>
          {uploadButtonText}
        </TextWithIcon>
      </Dropdown.Button>
      <input
        aria-label={uploadButtonText}
        disabled={isFileInputDisabled}
        type='file'
        ref={inputRef}
        className={classes.fileInput}
        onChange={handleFileChange}
        {...fileInputProps}
      />
    </>
  );
}

StudioDropdownFileUploaderButton.displayName = 'StudioDropdown.FileUploaderButton';
