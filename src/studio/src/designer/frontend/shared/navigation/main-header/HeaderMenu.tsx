import React from 'react';
import {
  Avatar,
  Divider,
  Grid,
  IconButton,
  MenuItem,
  Typography,
} from '@mui/material';
import { makeStyles } from '@mui/styles';
import { AltinnMenu } from 'app-shared/components';
import { post } from 'app-shared/utils/networking';
import { sharedUrls } from 'app-shared/utils/urlHelper';
import { getOrgNameById, HeaderContext, SelectedContextType } from './Header';
import { getLanguageFromKey } from '../../utils/language';

const useStyles = makeStyles(() => ({
  avatar: {
    height: 60,
    width: 60,
  },
  typography: {
    textAlign: 'right',
  },
  iconButton: {
    '&:hover': {
      backgroundColor: '#193d61',
    },
    '&:focus': {
      backgroundColor: '#193d61',
    },
  },
}));

export type HeaderMenuProps = {
  language: any;
};

export function HeaderMenu({ language }: HeaderMenuProps) {
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
    setMenuAnchorEl(null);
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
                  <br /> {getLanguageFromKey('shared.header_for', language)}{' '}
                  {getOrgNameById(selectedContext as number, selectableOrgs)}
                </>
              )}
          </Typography>
        </Grid>
        <Grid item>
          <IconButton
            id='profile-icon-button'
            className={classes.iconButton}
            onClick={openMenu}
          >
            <Avatar
              src={user.avatar_url}
              className={classes.avatar}
              alt={getLanguageFromKey('shared.header_button_alt', language)}
            />
          </IconButton>
        </Grid>
      </Grid>
      <AltinnMenu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={closeMenu}
      >
        <MenuItem
          id='menu-all'
          selected={selectedContext === SelectedContextType.All}
          onClick={() => handleSetSelectedContext(SelectedContextType.All)}
        >
          {getLanguageFromKey('shared.header_all', language)}
        </MenuItem>
        {selectableOrgs?.map((org) => {
          return (
            <MenuItem
              id={'menu-org-' + org.id}
              selected={selectedContext === org.id}
              key={org.id}
              onClick={() => handleSetSelectedContext(org.id)}
            >
              {org.full_name || org.username}
            </MenuItem>
          );
        })}
        <MenuItem
          id='menu-self'
          selected={selectedContext === SelectedContextType.Self}
          onClick={() => handleSetSelectedContext(SelectedContextType.Self)}
        >
          {user.full_name || user.login}
        </MenuItem>
        <Divider />
        <MenuItem key='placeholder' style={{ display: 'none' }} />
        <MenuItem id='menu-gitea'>
          <a
            href={sharedUrls().repositoryUrl}
            target='_blank'
            rel='noopener noreferrer'
          >
            {getLanguageFromKey('shared.header_go_to_gitea', language)}
          </a>
        </MenuItem>
        <MenuItem id='menu-logout' onClick={handleLogout}>
          {getLanguageFromKey('shared.header_logout', language)}
        </MenuItem>
      </AltinnMenu>
    </>
  );
}
