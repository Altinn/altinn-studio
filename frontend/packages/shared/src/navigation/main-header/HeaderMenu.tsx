import React, { useContext, useState } from 'react';
import { Avatar, Divider, Grid, IconButton, MenuItem, Typography } from '@mui/material';
import { AltinnMenu } from '../../components';
import { post } from '../../utils/networking';
import { getOrgNameByUsername, HeaderContext, SelectedContextType } from './Header';
import { repositoryBasePath, repositoryOwnerPath, repositoryPath } from '../../api/paths';
import classes from './HeaderMenu.module.css';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSelectedContext } from 'dashboard/hooks/useSelectedContext';

export type HeaderMenuProps = {
  org: string;
  repo?: string;
  user?: any;
};

export function HeaderMenu({ org, repo }: HeaderMenuProps) {
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | Element>(null);
  const { user, selectableOrgs } = useContext(HeaderContext);
  const { t } = useTranslation();
  const selectedContext = useSelectedContext();
  const navigate = useNavigate();
  const location = useLocation();

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

  const handleSetSelectedContext = (context: string | SelectedContextType) => {
    navigate('/' + context + location.search);
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
                  <br /> {t('shared.header_for')}{' '}
                  {getOrgNameByUsername(selectedContext, selectableOrgs)}
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
        {selectableOrgs?.map((selectableOrg) => {
          return (
            <MenuItem
              id={`menu-org-${selectableOrg.username}`}
              selected={selectedContext === selectableOrg.username}
              key={selectableOrg.id}
              onClick={() => handleSetSelectedContext(selectableOrg.username)}
            >
              {selectableOrg.full_name || selectableOrg.username}
            </MenuItem>
          );
        })}
        <MenuItem
          id='menu-self'
          selected={selectedContext === SelectedContextType.Self}
          onClick={() => handleSetSelectedContext('')}
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
