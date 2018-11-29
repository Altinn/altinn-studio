import { withStyles, WithStyles } from '@material-ui/core/styles';
import * as React from 'react';

export interface IDashboardComponentProps extends WithStyles<typeof styles> {
}
export interface IDashboardComponentState { }

const styles = {}

class DashboardComponent extends React.Component<IDashboardComponentProps, IDashboardComponentState> {
  public state: IDashboardComponentState = {

  }

  public render() {
    return (
      <div>
        <p>DashboardComponent</p>
      </div>
    );
  }
}

export default withStyles(styles)(DashboardComponent);
