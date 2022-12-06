import React, { useContext, useState } from 'react';
import { Avatar, Divider, Grid, IconButton, MenuItem, Typography } from '@mui/material';
import { makeStyles } from '@mui/styles';
import { AltinnMenu } from '../../components';
import { post } from '../../utils/networking';
import { getOrgNameById, HeaderContext, SelectedContextType } from './Header';
import { getLanguageFromKey } from '../../utils/language';
import { repositoryBasePath, repositoryOwnerPath, repositoryPath } from '../../api-paths';

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
  org: string;
  repo?: string;
};

export function HeaderMenu({ language, org, repo }: HeaderMenuProps) {
  const classes = useStyles();
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | Element>(null);
  const { user, selectedContext, selectableOrgs, setSelectedContext } = useContext(HeaderContext);
  const t = (key: string) => getLanguageFromKey(key, language);

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

  const getRepoPath = () => {
    const owner = org || user.login;
    if (owner && repo) {
      return repositoryPath(owner, repo);
    }
    if (owner) {
      return repositoryOwnerPath(owner);
    }
    return repositoryBasePath();
  }

  return (
    <>
      <Grid container spacing={2} alignItems='center'>
        <Grid item>
          <Typography className={classes.typography}>
            {user.full_name || user.login}{' '}
            {selectedContext !== SelectedContextType.All &&
              selectedContext !== SelectedContextType.Self && (
                <>
                  <br /> {t('shared.header_for')}{' '}
                  {getOrgNameById(selectedContext as number, selectableOrgs)}
                </>
              )}
          </Typography>
        </Grid>
        <Grid item>
          <IconButton id='profile-icon-button' className={classes.iconButton} onClick={openMenu}>
            <Avatar
              src={user.avatar_url}
              className={classes.avatar}
              alt={t('shared.header_button_alt')}
            />
          </IconButton>
        </Grid>
      </Grid>
      <AltinnMenu anchorEl={menuAnchorEl} open={Boolean(menuAnchorEl)} onClose={closeMenu}>
        <MenuItem
          id='menu-all'
          selected={selectedContext === SelectedContextType.All}
          onClick={() => handleSetSelectedContext(SelectedContextType.All)}
        >
          {t('shared.header_all')}
        </MenuItem>
        {selectableOrgs?.map((org) => {
          return (
            <MenuItem
              id={`menu-org-${org.id}`}
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
          <a href={getRepoPath()} target='_blank' rel='noopener noreferrer'>
            {t('shared.header_go_to_gitea')}
          </a>
        </MenuItem>
        <MenuItem id='menu-logout' onClick={handleLogout}>
          {t('shared.header_logout')}
        </MenuItem>
      </AltinnMenu>
    </>
  );
}
