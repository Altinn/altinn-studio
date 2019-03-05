import { Checkbox, createStyles, WithStyles, withStyles } from '@material-ui/core';
import React = require('react');

export interface IAltinnCheckBoxComponentProvidedProps extends WithStyles<typeof styles> {
  id?: any;
  onChangeFunction: any;
  checked: boolean;
}

export interface IAltinnCheckBoxComponentState {
}

const styles = () => createStyles({
  altinnCheckBox: {
    paddingLeft: '0px',
    paddingRight: '6px',
    paddingTop: '6px',
  },
});

class AltinnCheckBox extends
  React.Component<IAltinnCheckBoxComponentProvidedProps, IAltinnCheckBoxComponentState> {

  public render() {
    const { classes } = this.props;
    return (
      <Checkbox
        id={this.props.id}
        classes={{ root: classes.altinnCheckBox }}
        checked={this.props.checked}
        onChange={this.props.onChangeFunction}
      />
    );
  }
}

export default withStyles(styles)(AltinnCheckBox);
