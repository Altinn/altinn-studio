import { createStyles, Grid, Typography, WithStyles, withStyles } from '@material-ui/core';
import * as React from 'react';
import { IProfile } from 'altinn-shared/types';

const styles = createStyles({
  profileIcon: {
    fontSize: '36px',
    padding: 12,
  },
  profileContent: {
    padding: 12,
  },
  profileContentName: {
    fontSize: '2rem',
    fontWeight: 600,
  },
  profileContentLink: {
    fontSize: '1.5rem',
  },
});

export interface IAltinnProfileProps extends WithStyles<typeof styles> {
  profile: IProfile;
}

function AltinnProfile(props: IAltinnProfileProps) {
  const { classes, profile } = props;

  if (!profile) {
    return null;
  }

  return (
    <Grid container={true}>
      <Grid item={true}>
        <i className={`${classes.profileIcon} fa fa-private`}/>
      </Grid>
      <Grid item={true} className={classes.profileContent}>
        <Grid item={true}>
          <Typography className={classes.profileContentName}>
            {profile.party.person.firstName} {profile.party.person.lastName}
          </Typography>
        </Grid>
        <Grid item={true}>
          <Typography className={classes.profileContentLink}>
            Instillinger
          </Typography>
        </Grid>
      </Grid>
    </Grid>
  );
}

export default withStyles(styles)(AltinnProfile);
