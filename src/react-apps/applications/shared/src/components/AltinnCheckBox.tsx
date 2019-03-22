import { Checkbox, createMuiTheme, createStyles, WithStyles, withStyles } from '@material-ui/core';
import React = require('react');
import altinnTheme from '../theme/altinnStudioTheme';
export interface IAltinnCheckBoxComponentProvidedProps extends WithStyles<typeof styles> {
  checked: boolean;
  disabled?: boolean;
  id?: any;
  onChangeFunction: any;
}

export interface IAltinnCheckBoxComponentState {
}
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

const AltinnCheckBox = (props: IAltinnCheckBoxComponentProvidedProps) => {
  const { classes } = props;
  return (
    <Checkbox
      id={props.id}
      className={classes.altinnCheckBox}
      checked={props.checked}
      onChange={props.onChangeFunction}
    />
  );
};

export default withStyles(styles)(AltinnCheckBox);
