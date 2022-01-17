import { Button, createTheme } from '@material-ui/core';
import { createStyles, makeStyles } from '@material-ui/core/styles';
import classNames from 'classnames';
import * as React from 'react';
import altinnTheme from '../theme/altinnStudioTheme';

export interface IAltinnButtonComponentProvidedProps {
  /** Button ID */
  id?: any;
  /** Text shown on button */
  btnText: string;
  /** onClick function */
  onClickFunction?: any;
  /** Class objects created with Material-Ui's createStyle */
  className?: any;
  /** Secondary styling */
  secondaryButton?: boolean;
  /** Disabled styling */
  disabled?: boolean;
  /** Button ref */
  btnRef?: React.RefObject<any>;
}

const theme = createTheme(altinnTheme);

const useStyles = makeStyles(() => createStyles({
  borderBottom: {
    borderBottom: `1px solid ${altinnTheme.altinnPalette.primary.blueDark}`,
  },
  borderBottomDisabled: {
    borderBottom: `1px solid ${altinnTheme.altinnPalette.primary.greyMedium}`,
  },
  button: {
    color: theme.altinnPalette.primary.black,
    background: theme.altinnPalette.primary.blue,
    textTransform: 'none',
    transition: 'none',
    fontWeight: 400,
    fontFamily: 'Altinn-DIN',
    height: 36,
    width: '100%',
    borderRadius: '0',
    boxShadow: 'none',
    marginTop: '6px',
    marginBottom: '6px',
    '@media (min-width:576px)': {
      width: 'auto',
    },
    '&:hover': {
      background: theme.altinnPalette.primary.blueHover,
      color: theme.altinnPalette.primary.black,
      boxShadow: 'none',
    },
    '&:focus': {
      background: theme.altinnPalette.primary.blueHover,
      color: theme.altinnPalette.primary.black,
      boxShadow: 'none',
      outline: '2px solid',
      outlineColor: theme.altinnPalette.primary.blueDark,
    },
  },
  secondaryButton: {
    fontSize: '14px',
    color: theme.altinnPalette.primary.blueDarker,
    background: 'transparent',
    height: 36,
    textTransform: 'none',
    fontWeight: 400,
    borderRadius: '0',
    '&:hover': {
      background: theme.altinnPalette.primary.greyLight,
      color: theme.altinnPalette.primary.blueDarker,
    },
    '&:focus': {
      background: theme.altinnPalette.primary.greyLight,
      color: theme.altinnPalette.primary.black,
      outline: 'none',
    },
  },
}));

export const AltinnButton = React.forwardRef((props: IAltinnButtonComponentProvidedProps, ref: any) => {
  const classes = useStyles(props);

  return (
    <Button
      id={props.id}
      disabled={props.disabled}
      variant={props.secondaryButton === true ? 'text' : 'contained'}
      color='primary'
      className={classNames(props.className, {
        [classes.button]: props.secondaryButton !== true,
        [classes.secondaryButton]: props.secondaryButton === true,
      })}
      onClick={props.onClickFunction}
      style={{ fontSize: 16 }}
      ref={ref}
      aria-label={props.btnText}
    >
      <span
        className={classNames({
          [classes.borderBottom]: props.secondaryButton === true && props.disabled !== true,
          [classes.borderBottomDisabled]: props.secondaryButton === true && props.disabled === true,
        })}
      >
        {props.btnText}
      </span>
    </Button>
  );
});

AltinnButton.displayName = 'AltinnButton';

export default AltinnButton;
