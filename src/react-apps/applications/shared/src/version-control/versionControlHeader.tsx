import * as React from 'react';
import { WithStyles, createStyles, withStyles } from '@material-ui/core';

export interface IVersionControlHeaderProps extends WithStyles<typeof styles> {

}

export interface IVersionControlHeaderState {

}

const styles = createStyles({

});

class VersionControlHeader extends React.Component<IVersionControlHeaderProps, IVersionControlHeaderState> {

  public render() {
    return (
      <div>test</div>
    );
  }
}

export default withStyles(styles)(VersionControlHeader);
