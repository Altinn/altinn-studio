import { Button, createTheme, makeStyles } from '@material-ui/core';
import classNames from 'classnames';
import * as React from 'react';
import altinnTheme from '../theme/altinnStudioTheme';

export interface IAltinnIconButtonComponentProvidedProps {
  classes: any;
  onclickFunction?: any;
  className?: string;
  iconClass: string;
  btnText: string;
  id?: any;
}

const theme = createTheme(altinnTheme);

const useStyles = makeStyles({
  dottedBtn: {
    minHeight: '60px',
    fontWeight: 700,
    width: '100%',
    color: '#000',
    textAlign: 'left',
    verticalAlign: 'middle',
    backgroundColor: 'transparent',
    border: '1px dotted ' + theme.altinnPalette.primary.blueDark,
    boxShadow: 'none',
    borderRadius: '0px',
    textTransform: 'none',
    maxWidth: '170px',
    justifyContent: 'right',
    fontSize: '16px',
    '&:hover': {
      backgroundColor: 'transparent !Important',
    },
    '&:focus': {
      backgroundColor: 'transparent !Important',
    },
  },
  dottedBtnIcon: {
    color: theme.altinnPalette.primary.blueDark,
    fontSize: '54px',
    paddingRight: '6px',
  },
});

export const AltinnIconButton = ({
  id,
  onclickFunction,
  btnText,
  iconClass,
}: IAltinnIconButtonComponentProvidedProps) => {
  const classes = useStyles();

  return (
    <Button
      id={id}
      variant='contained'
      className={classes.dottedBtn}
      onClick={onclickFunction}
    >
      <i className={classNames(iconClass, classes.dottedBtnIcon)} />
      {btnText}
    </Button>
  );
};

export default AltinnIconButton;
