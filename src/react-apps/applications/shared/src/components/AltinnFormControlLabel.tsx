import { createStyles, FormControlLabel, WithStyles, withStyles } from '@material-ui/core';
import React = require('react');

export interface IAltinnFormControlLabelProvidedProps extends WithStyles<typeof styles> {
  /** The id */
  id?: any;
  /** The label */
  label: string;
  /** The component it controls */
  control: any;
  /** @ignore */
  classes: any;
}

const styles = () => createStyles({
  label: {
    fontSize: 16,
  },
  root: {
    marginRight: 24,
    marginLeft: 0,
  },
});

export class AltinnFormControlLabel extends React.Component<IAltinnFormControlLabelProvidedProps> {
  public render() {
    const { classes } = this.props;
    return (
      <FormControlLabel
        classes={{ label: classes.label, root: classes.root }}
        label={this.props.label}
        control={this.props.control}
      />
    );
  }
}

export default withStyles(styles)(AltinnFormControlLabel);
