import { Button, makeStyles } from '@material-ui/core';
import * as React from 'react';
import classNames from 'classnames';

interface TopToolbarButtonProps extends React.PropsWithChildren<any> {
  onClick: (event: any) => void;
  startIcon: React.ReactNode;
  disabled?: boolean;
  hideText?: boolean;
  warning?: boolean;
}

const useStyles = makeStyles({
  toolbarButton: {
    margin: 1,
    border: 0,
    padding: '4px 8px',
    height: 36,
    boxShadow: 'none',
    borderRadius: 0,
    background: '#fff',
    fontFamily: 'Roboto',
    fontSize: '1em',
    fontWeight: 'normal',
    textTransform: 'none',
    '&:hover': {
      background: '#006BD8',
      color: '#fff',
    },
    '&.warn:hover': {
      background: '#D02F4C',
    },
  },
  noText: {
    '& > span .MuiButton-startIcon': {
      margin: 0,
    },
    '&.MuiButton-root': {
      minWidth: 36,
    },
  },
});

export default function TopToolbarButton({ onClick, disabled, startIcon, children, hideText, warning }: TopToolbarButtonProps) {
  const classes = useStyles();
  const buttonTextClasses = classNames([hideText && 'sr-only']);
  return (
    <Button
      className={classNames([classes.toolbarButton, hideText && classes.noText, warning && 'warn'])}
      onClick={onClick}
      type='button'
      variant='contained'
      disabled={disabled}
      startIcon={startIcon}
    ><span className={buttonTextClasses}>{children}</span>
    </Button>
  );
}
TopToolbarButton.defaultProps = {
  disabled: false,
  hideText: false,
  warning: false,
};
