import { createStyles, FormControlLabel, WithStyles, withStyles } from '@material-ui/core';
import React = require('react');

export interface IAltinnFormControlLabelProvidedProps extends WithStyles<typeof styles> {
  id?: any;
  label: string;
  control: any;
}

const styles = () => createStyles({
  label: {
    fontSize: 16,
  },
  root: {
    marginRight: 48,
    marginLeft: 0,
  },
});

export class AltinnFormControlLabelClass extends React.Component<IAltinnFormControlLabelProvidedProps> {
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

export default withStyles(styles)(AltinnFormControlLabelClass);
