import { createStyles, Grid, withStyles, WithStyles } from '@material-ui/core';
import * as React from 'react';
import { RouteComponentProps, withRouter } from 'react-router-dom';
import DeployContainer from '../containers/deployContainer';
import ReleaseContainer from '../containers/releaseContainer';

const styles = createStyles({
  deployPage: {
    padding: '1.2rem',
  },
  deployPageContainer: {
    padding: '1.2rem',
  },
});

export interface IDeployPaperProps extends WithStyles<typeof styles>, RouteComponentProps {
}

function DeployPage(props: IDeployPaperProps) {
  const { classes } = props;
  return (
    <Grid
      className={classes.deployPage}
      container={true}
      direction={'column'}
    >
      <Grid
        className={classes.deployPageContainer}
        container={true}
        direction={'row'}
        justify={'space-between'}
      >
        <Grid item={true}>
          <DeployContainer/>
        </Grid>
        <Grid item={true}>
          <ReleaseContainer/>
        </Grid>
      </Grid>
    </Grid>
  );
}

export default withStyles(styles)(withRouter(DeployPage));
