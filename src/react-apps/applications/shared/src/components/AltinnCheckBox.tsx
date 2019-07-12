import { Checkbox, createMuiTheme, createStyles, WithStyles, withStyles } from '@material-ui/core';
import React = require('react');
import altinnTheme from '../theme/altinnStudioTheme';
export interface IAltinnCheckBoxComponentProvidedProps extends WithStyles<typeof styles> {
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

export interface IAltinnCheckBoxComponentState { }

const theme = createMuiTheme(altinnTheme);

const styles = () => createStyles({
  altinnCheckBox: {
    'padding': '0px',
    'color': theme.altinnPalette.primary.blueDark + ' !important',
    '&span': {
      height: '20px',
      width: '20px',
      marginRight: '6px',
      marginTop: '6px',
    },
  },
});

export const AltinnCheckBox = (props: IAltinnCheckBoxComponentProvidedProps) => {
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
    />
  );
};

export default withStyles(styles)(AltinnCheckBox);
