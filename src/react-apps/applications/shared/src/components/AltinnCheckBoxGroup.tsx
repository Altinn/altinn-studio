import { createMuiTheme, createStyles, FormGroup, WithStyles, withStyles } from '@material-ui/core';
import React = require('react');
import altinnTheme from '../theme/altinnStudioTheme';

export interface IAltinnCheckBoxGroupProvidedProps extends WithStyles<typeof styles> {
  id?: any;
  row: boolean;
}

export interface IAltinnCheckBoxGroupState {
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

export class AltinnCheckBoxGroupClass extends React.Component<IAltinnCheckBoxGroupProvidedProps> {
  public render() {
    return (
      <FormGroup row={this.props.row}>
        {this.props.children}
      </FormGroup>
    );
  }
}

export default withStyles(styles)(AltinnCheckBoxGroupClass);
