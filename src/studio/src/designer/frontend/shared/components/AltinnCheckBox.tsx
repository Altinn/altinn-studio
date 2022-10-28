import React from 'react';
import { Checkbox, createTheme } from '@mui/material';
import { createStyles, WithStyles, withStyles } from '@mui/styles';
import altinnTheme from '../theme/altinnStudioTheme';

export interface IAltinnCheckBoxComponentProvidedProps
  extends WithStyles<typeof styles> {
  /** If the component is checked */
  checked: boolean;
  /** If the component should be disabeld */
  disabled?: boolean;
  /** Check box component ID */
  id?: any;
  /** Called when onChange is triggered */
  onChangeFunction?: any;
  /** Called when onKeyPress is triggered */
  onKeyPressFunction?: any;
  /** @ignore */
  classes: any;
}

const theme = createTheme(altinnTheme);

const styles = () =>
  createStyles({
    altinnCheckBox: {
      color: `${theme.altinnPalette.primary.blueDark} !important`,
      '& span': {
        '& svg': {
          fontSize: '2.5rem',
        },
      },
      paddingLeft: 0,
    },
  });

export const AltinnCheckBox = (
  props: IAltinnCheckBoxComponentProvidedProps,
) => {
  const { classes } = props;
  return (
    <Checkbox
      id={props.id}
      className={classes.altinnCheckBox}
      checked={props.checked}
      onChange={props.onChangeFunction}
      disabled={props.disabled ? props.disabled : false}
      onKeyPress={props.onKeyPressFunction}
      tabIndex={0}
      disableRipple={false}
    />
  );
};

export default withStyles(styles)(AltinnCheckBox);
