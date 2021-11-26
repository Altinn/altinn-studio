import {
  Grid,
  Typography,
  Avatar,
  makeStyles,
  MenuItem,
  IconButton,
  Divider,
} from '@material-ui/core';
import { AltinnMenu } from 'app-shared/components';
import { IGiteaOrganisation } from 'app-shared/types';
import { post } from 'app-shared/utils/networking';
import { sharedUrls } from 'app-shared/utils/urlHelper';
import * as React from 'react';
import { HeaderContext, SelectedContextType } from './Header';

const useStyles = makeStyles(() => ({
  avatar: {
    height: 60,
    width: 60,
  },
  typography: {
    textAlign: 'right',
  },
}));

const getOrgNameById = (id: number, orgs: IGiteaOrganisation[]) => {
  const org = orgs?.find((org) => org.id === id);
  return org?.full_name || org?.username;
};

export function HeaderMenu() {
  const classes = useStyles();
  const [menuAnchorEl, setMenuAnchorEl] = React.useState<null | Element>(null);
  const { user, selectedContext, selectableOrgs, setSelectedContext } =
    React.useContext(HeaderContext);

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
  };

  const handleSetSelectedContext = (context: string | number) => {
    setSelectedContext(context);
  };

  return (
    <>
      <Grid container spacing={2} alignItems='center'>
        <Grid item>
          <Typography className={classes.typography}>
            {user.full_name || user.login}{' '}
            {selectedContext !== SelectedContextType.All &&
              selectedContext !== SelectedContextType.Self && (
                <>
                  <br /> for{' '}
                  {getOrgNameById(selectedContext as number, selectableOrgs)}
                </>
              )}
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
        <MenuItem
          selected={selectedContext === SelectedContextType.All}
          onClick={() => handleSetSelectedContext(SelectedContextType.All)}
        >
          Alle
        </MenuItem>
        {selectableOrgs?.map((org) => {
          return (
            <MenuItem
              selected={selectedContext === org.id}
              key={org.id}
              onClick={() => handleSetSelectedContext(org.id)}
            >
              {org.full_name || org.username}
            </MenuItem>
          );
        })}
        <MenuItem
          selected={selectedContext === SelectedContextType.Self}
          onClick={() => handleSetSelectedContext(SelectedContextType.Self)}
        >
          {user.full_name || user.login}
        </MenuItem>
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
        <MenuItem onClick={handleLogout}>Logg ut</MenuItem>
      </AltinnMenu>
    </>
  );
}
