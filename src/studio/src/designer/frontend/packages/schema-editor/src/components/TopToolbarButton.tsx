import { Button, makeStyles } from '@material-ui/core';
import * as React from 'react';
import classNames from 'classnames';

interface TopToolbarButtonProps extends React.PropsWithChildren<any> {
  onClick: (event: any) => void;
  startIcon: React.ReactNode;
  disabled?: boolean;
  hideText?: boolean;
}

const useStyles = makeStyles({
  toolbarButton: {
    margin: 4,
    background: '#fff',
  },
  noText: {
    '& > span .MuiButton-startIcon': {
      margin: 0,
    },
    '&.MuiButton-root': {
      padding: 6,
      minWidth: 20,
    },
  },
});

export default function TopToolbarButton({ onClick, disabled, startIcon, children, hideText }: TopToolbarButtonProps) {
  const classes = useStyles();
  const buttonTextClasses = hideText ? 'sr-only' : '';
  return (
    <Button
      className={classNames([classes.toolbarButton, hideText && classes.noText])}
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
};
