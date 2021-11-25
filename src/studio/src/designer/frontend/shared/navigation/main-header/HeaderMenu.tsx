import { Grid, Typography, Avatar, makeStyles, MenuItem, IconButton, Divider } from '@material-ui/core';
import { AltinnMenu } from 'app-shared/components';
import { IUser } from 'app-shared/types';
import { post } from 'app-shared/utils/networking';
import { sharedUrls } from 'app-shared/utils/urlHelper';
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
  const [menuAnchorEl, setMenuAnchorEl] = React.useState<null | Element>(null);

  const openMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuAnchorEl(e.currentTarget);
  };

  const closeMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuAnchorEl(null);
  };

  const handleLogout = () => {
    const altinnWindow: Window = window;
    const url = `${altinnWindow.location.origin}/repos/user/logout`;
    post(url).then(() => {
      window.location.assign(`${altinnWindow.location.origin}/Home/Logout`);
    });
    return true;
  }

  return (
    <>
      <Grid container spacing={2} alignItems='center'>
        <Grid item>
          <Typography className={classes.typography}>
            {user.full_name || user.login} <br />for {org}
          </Typography>
        </Grid>
        <Grid item>
          <IconButton onClick={openMenu}>
            <Avatar src={user.avatar_url} className={classes.avatar} />
          </IconButton>
        </Grid>
      </Grid>
      <AltinnMenu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={closeMenu}
      >
        <Divider />
        <MenuItem key='placeholder' style={{ display: 'none' }} />
        <MenuItem>
          <a
            href={sharedUrls().repositoryUrl}
            target='_blank'
            rel='noopener noreferrer'
          >
            Gå til Gitea
          </a>
        </MenuItem>
        <MenuItem
          onClick={handleLogout}
        >
          Logg ut
        </MenuItem>
      </AltinnMenu>
    </>
  );
}

export default HeaderMenu;
