// StudioDropdownFileUploaderButton
import React, { useContext } from 'react';
import type { ChangeEvent, ReactElement, ReactNode } from 'react';
import { Dropdown } from '@digdir/designsystemet-react';
import type { DropdownButtonProps } from '@digdir/designsystemet-react';
import type { IconPlacement } from '../../../types/IconPlacement';
import cn from 'classnames';
import classes from './StudioDropdownFileUploaderButton.module.css';
import { StudioDropdownContext } from '../StudioDropdownContext';
import { IconWithTextComponent } from '../../IconWithTextComponent';

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
  const { setOpen } = useContext(StudioDropdownContext);

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
        <IconWithTextComponent icon={icon} iconPlacement={iconPlacement}>
          {children}
        </IconWithTextComponent>
        <input type='file' className={classes.fileInput} onChange={handleFileChange} />
      </label>
    </Dropdown.Button>
  );
}

StudioDropdownFileUploaderButton.displayName = 'StudioDropdown.FileUploaderButton';
