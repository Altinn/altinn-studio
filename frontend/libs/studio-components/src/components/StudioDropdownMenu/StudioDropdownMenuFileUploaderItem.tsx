import type { ChangeEvent, ReactNode } from 'react';
import React, { forwardRef, useContext } from 'react';
import { DropdownMenu } from '@digdir/designsystemet-react';
import type { DropdownMenuItemProps } from '@digdir/designsystemet-react';
import type { IconPlacement } from '../../types/IconPlacement';
import type { OverridableComponent } from '../../types/OverridableComponent';
import cn from 'classnames';
import classes from './StudioDropdownMenuFileUploaderItem.module.css';
import { StudioDropdownMenuContext } from './StudioDropdownMenuContext';

export type StudioDropdownMenuFileUploaderItemProps = {
  icon?: ReactNode;
  iconPlacement?: IconPlacement;
  onFileUpload?: (file: File) => void;
} & Omit<DropdownMenuItemProps, 'icon'>;

const StudioDropdownMenuFileUploaderItem: OverridableComponent<
  StudioDropdownMenuFileUploaderItemProps,
  HTMLLabelElement
> = forwardRef<HTMLLabelElement, StudioDropdownMenuFileUploaderItemProps>(
  ({ children, icon, iconPlacement = 'left', className, onFileUpload, ...rest }, ref) => {
    const { setOpen } = useContext(StudioDropdownMenuContext);

    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        onFileUpload?.(file);
        setOpen(false);
      }
    };

    const iconComponent = (
      <span aria-hidden className={classes.iconWrapper}>
        {icon}
      </span>
    );

    return (
      <DropdownMenu.Item
        className={cn(className, classes.studioDropdownMenuFileUploaderItem)}
        {...rest}
      >
        <label className={classes.fileUploaderLabel} ref={ref}>
          {icon && iconPlacement === 'left' && iconComponent}
          {children}
          {icon && iconPlacement === 'right' && iconComponent}
          <input type='file' className={classes.fileInput} onChange={handleFileChange} />
        </label>
      </DropdownMenu.Item>
    );
  },
);

StudioDropdownMenuFileUploaderItem.displayName = 'StudioDropdownMenu.FileUploaderItem';

export { StudioDropdownMenuFileUploaderItem };
