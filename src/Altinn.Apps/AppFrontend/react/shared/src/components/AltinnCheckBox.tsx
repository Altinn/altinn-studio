import {
  Checkbox,
  createTheme,
  createStyles,
  WithStyles,
  withStyles,
} from '@material-ui/core';
import React = require('react');
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
      color: theme.altinnPalette.primary.blueDark + ' !important',
      '& span': {
        '& svg': {
          fontSize: '2.5rem',
        },
      },
    },
  });

export const AltinnCheckBox = ({
  classes,
  id,
  checked,
  onChangeFunction,
  disabled,
  onKeyPressFunction,
}: IAltinnCheckBoxComponentProvidedProps) => {
  return (
    <Checkbox
      id={id}
      className={classes.altinnCheckBox}
      checked={checked}
      onChange={onChangeFunction}
      disabled={disabled ? disabled : false}
      onKeyPress={onKeyPressFunction}
      tabIndex={0}
      disableRipple={false}
    />
  );
};

export default withStyles(styles)(AltinnCheckBox);
