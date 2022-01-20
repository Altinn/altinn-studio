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

const useStyles = makeStyles(() =>
  createStyles({
    borderBottom: {
      borderBottom: `1px solid ${altinnTheme.altinnPalette.primary.blueDark}`,
    },
    borderBottomDisabled: {
      borderBottom: `1px solid ${altinnTheme.altinnPalette.primary.greyMedium}`,
    },
    button: {
      color: theme.altinnPalette.primary.white,
      background: theme.altinnPalette.primary.blueDark,
      textTransform: 'none',
      fontWeight: 400,
      height: 36,
      borderRadius: '0',
      '&:hover': {
        background: theme.altinnPalette.primary.blueDarker,
        color: theme.altinnPalette.primary.white,
      },
      '&:focus': {
        background: theme.altinnPalette.primary.blueDarker,
        color: theme.altinnPalette.primary.white,
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
      },
    },
  }),
);

const fontSize = { fontSize: 16 };

const AltinnButton = React.forwardRef(
  (
    {
      id,
      disabled,
      secondaryButton,
      className,
      onClickFunction,
      btnText,
    }: IAltinnButtonComponentProvidedProps,
    ref: any,
  ) => {
    const classes = useStyles();

    return (
      <Button
        id={id}
        disabled={disabled}
        variant={secondaryButton === true ? 'text' : 'contained'}
        color='primary'
        className={classNames(className, {
          [classes.button]: secondaryButton !== true,
          [classes.secondaryButton]: secondaryButton === true,
        })}
        onClick={onClickFunction}
        style={fontSize}
        ref={ref}
      >
        <span
          className={classNames({
            [classes.borderBottom]:
              secondaryButton === true && disabled !== true,
            [classes.borderBottomDisabled]:
              secondaryButton === true && disabled === true,
          })}
        >
          {btnText}
        </span>
      </Button>
    );
  },
);

AltinnButton.displayName = 'AltinnButton';

export default AltinnButton;
