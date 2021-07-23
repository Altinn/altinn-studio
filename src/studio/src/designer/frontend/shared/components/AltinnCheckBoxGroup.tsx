import { createTheme, createStyles, FormGroup, WithStyles, withStyles } from '@material-ui/core';
import React = require('react');
import altinnTheme from '../theme/altinnStudioTheme';

export interface IAltinnCheckBoxGroupProvidedProps extends WithStyles<typeof styles> {
  /** Check box group ID */
  id?: any;
  /** If the group should be displayed as a row, if set to false the group is shown as a column */
  row: boolean;
  /** @ignore */
  classes: any;
}

export interface IAltinnCheckBoxGroupState {
}
const theme = createTheme(altinnTheme);

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

export class AltinnCheckBoxGroup extends React.Component<IAltinnCheckBoxGroupProvidedProps> {
  public render() {
    return (
      <FormGroup row={this.props.row}>
        {this.props.children}
      </FormGroup>
    );
  }
}

export default withStyles(styles)(AltinnCheckBoxGroup);
