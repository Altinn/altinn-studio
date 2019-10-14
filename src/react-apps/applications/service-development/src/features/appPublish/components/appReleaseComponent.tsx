import {
  createStyles,
  Grid,
  Typography,
  withStyles,
  WithStyles,
} from '@material-ui/core';
import * as React from 'react';
import { IRelease } from '../../../sharedResources/appRelease/types';

const styles = createStyles({
  releaseWrapper: {
    padding: '1.2rem',
  },
  releaseTitle: {
    fontSize: '2rem',
  },
});

export interface IAppReleaseComponent extends WithStyles<typeof styles> {
  release: IRelease;
}

function ReleaseComponent(props: IAppReleaseComponent) {
  const {classes, release} = props;
  return (
    <Grid
      container={true}
      direction={'column'}
      className={classes.releaseWrapper}
    >
      <Typography className={classes.releaseTitle}>
        {release.name}
      </Typography>
    </Grid>
  );
}

export default withStyles(styles)(ReleaseComponent);
