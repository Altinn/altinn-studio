import type { PropsWithChildren } from 'react';
import React from 'react';
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

export function TopToolbarButton({
  onClick,
  disabled,
  faIcon,
  children,
  hideText,
  warning,
  iconSize,
  className,
  id,
}: TopToolbarButtonProps) {
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
        className={computedClasses}
        onClick={onClick}
        disabled={disabled}
        color='primary'
        aria-label={children}
      >
        {icon}
      </IconButton>
    );
  }
  return (
    <Button
      data-testid={id}
      id={id}
      className={computedClasses}
      onClick={onClick}
      variant='text'
      disabled={disabled}
      startIcon={icon}
    >
      {children}
    </Button>
  );
}
TopToolbarButton.defaultProps = {
  disabled: false,
  hideText: false,
  warning: false,
  iconSize: undefined,
};
