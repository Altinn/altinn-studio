import React from 'react';
import type { ChangeEvent, ReactElement, ReactNode } from 'react';
import { Dropdown } from '@digdir/designsystemet-react';
import type { DropdownButtonProps } from '@digdir/designsystemet-react';
import type { IconPlacement } from '../../../types/IconPlacement';
import cn from 'classnames';
import classes from './StudioDropdownFileUploaderButton.module.css';
import { useStudioDropdownContext } from '../context/StudioDropdownContext';
import { TextWithIcon } from '../../TextWithIcon';

export type StudioDropdownFileUploaderButtonProps = {
  icon?: ReactNode;
  iconPlacement?: IconPlacement;
  onFileUpload?: (file: File) => void;
} & Omit<DropdownButtonProps, 'icon'>;

export function StudioDropdownFileUploaderButton({
  children,
  icon,
  iconPlacement = 'left',
  className,
  onFileUpload,
  ...rest
}: StudioDropdownFileUploaderButtonProps): ReactElement {
  const { setOpen } = useStudioDropdownContext();

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    if (file) {
      onFileUpload?.(file);
      setOpen(false);
    }
  };

  return (
    <Dropdown.Button className={cn(className, classes.studioDropdownFileUploaderButton)} {...rest}>
      <label className={classes.fileUploaderLabel}>
        <TextWithIcon icon={icon} iconPlacement={iconPlacement}>
          {children}
        </TextWithIcon>
        <input type='file' className={classes.fileInput} onChange={handleFileChange} />
      </label>
    </Dropdown.Button>
  );
}

StudioDropdownFileUploaderButton.displayName = 'StudioDropdown.FileUploaderButton';
