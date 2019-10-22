import { createStyles, Grid, withStyles, WithStyles } from '@material-ui/core';
import * as React from 'react';
import { RouteComponentProps, withRouter } from 'react-router-dom';
import DeployContainer from '../containers/deployContainer';
import ReleaseContainer from '../containers/releaseContainer';
const styles = createStyles({
});
export interface IDeployPaperProps extends WithStyles<typeof styles>, RouteComponentProps {
}
function DeployPage(props: IDeployPaperProps) {
  // const { classes } = props;
  return (
    <Grid
      container={true}
      direction={'column'}
    >
      <Grid
        container={true}
        direction={'row'}
        justify={'space-between'}
      >
        <Grid item={true} xs={9}>
          <DeployContainer/>
        </Grid>
        <Grid item={true} xs={3}>
          <ReleaseContainer/>
        </Grid>
      </Grid>
    </Grid>
  );
}
export default withStyles(styles)(withRouter(DeployPage));
