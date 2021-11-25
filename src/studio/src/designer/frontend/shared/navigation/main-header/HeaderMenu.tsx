import { Grid, Typography, Avatar, makeStyles } from '@material-ui/core';
import { IUser } from 'app-shared/types';
import * as React from 'react';

export interface HeaderMenuProps {
  user: IUser;
  org: string;
}

const useStyles = makeStyles(() => ({
  avatar: {
    height: 60,
    width: 60,
  },
  typography: {
    textAlign: 'right',
  },
}));

export function HeaderMenu({ user, org }: HeaderMenuProps) {
  const classes = useStyles();
  return (
    <Grid container spacing={2}>
      <Grid item>
        <Typography className={classes.typography}>
          {user.full_name || user.login} <br />for {org}
        </Typography>
      </Grid>
      <Grid item>
        <Avatar src={user.avatar_url} className={classes.avatar} />
      </Grid>
    </Grid>
  );
}

export default HeaderMenu;
