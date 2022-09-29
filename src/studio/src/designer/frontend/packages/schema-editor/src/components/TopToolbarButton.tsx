import React from 'react';
import { Button, IconButton, makeStyles } from '@material-ui/core';
import classNames from 'classnames';

interface TopToolbarButtonProps extends React.PropsWithChildren<any> {
  onClick: (event: any) => void;
  faIcon: string;
  iconSize?: number;
  disabled?: boolean;
  hideText?: boolean;
  warning?: boolean;
  className?: string;
  id: string;
}

const useStyles = makeStyles({
  toolbarButton: {
    margin: 0,
    border: 0,
    height: 36,
    borderRadius: 0,
    fontFamily: 'Roboto',
    fontSize: '1em',
    padding: '4px 8px',
    fontWeight: 'normal',
    textTransform: 'none',
    '&:hover': {
      background: '#006BD8',
      color: '#fff',
    },
    '&.warn:hover': {
      background: '#D02F4C',
    },
    '& .MuiButton-startIcon': {
      marginRight: 4,
    },
    '& .fa': {
      width: 'auto',
      margin: 4,
    },
    '& .fa-plus:before': {
      content: '"\\f068"',
    },
  },
  iconButton: {
    width: 36,
    padding: 0,
  },
});

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
  const classes = useStyles();
  const computedClasses = classNames([
    classes.toolbarButton,
    hideText && classes.iconButton,
    warning && 'warn',
    className,
  ]);
  const icon = <i className={faIcon} style={{ ...(iconSize && { fontSize: iconSize }) }} aria-hidden />;
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
    <Button id={id} className={computedClasses} onClick={onClick} variant='text' disabled={disabled} startIcon={icon}>
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
