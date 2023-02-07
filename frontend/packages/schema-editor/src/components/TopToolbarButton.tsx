import type { PropsWithChildren } from 'react';
import React, { forwardRef, Ref } from 'react';
import { Button, IconButton } from '@mui/material';
import classNames from 'classnames';
import classes from './TopToolbarButton.module.css';

interface TopToolbarButtonProps extends PropsWithChildren<any> {
  onClick: (event: any) => void;
  faIcon: string;
  iconSize?: number;
  disabled?: boolean;
  hideText?: boolean;
  warning?: boolean;
  className?: string;
  id: string;
}

const TopToolbarButton = forwardRef(
  (
    {
      onClick,
      disabled = false,
      faIcon,
      children,
      hideText = false,
      warning = false,
      iconSize = undefined,
      className,
      id,
    }: TopToolbarButtonProps,
    ref: Ref<HTMLButtonElement>
  ) => {
    const computedClasses = classNames([
      classes.toolbarButton,
      hideText && classes.iconButton,
      warning && 'warn',
      className,
    ]);
    const icon = (
      <i className={faIcon} style={{ ...(iconSize && { fontSize: iconSize }) }} aria-hidden />
    );
    if (hideText) {
      return (
        <IconButton
          aria-label={children}
          className={computedClasses}
          color='primary'
          disabled={disabled}
          onClick={onClick}
          ref={ref}
        >
          {icon}
        </IconButton>
      );
    }
    return (
      <Button
        className={computedClasses}
        data-testid={id}
        disabled={disabled}
        id={id}
        onClick={onClick}
        ref={ref}
        startIcon={icon}
        variant='text'
      >
        {children}
      </Button>
    );
  }
);

TopToolbarButton.displayName = 'TopToolbarButton';
export { TopToolbarButton };
