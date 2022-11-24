import React, { useState } from 'react';
import { IconButton, Menu, MenuItem } from '@mui/material';
import { altinnDocsUrl } from 'app-shared/ext-urls';
import { post } from '../../utils/networking';
import { AccountCircle } from '@mui/icons-material';
import { repositoryPath, userLogoutAfterPath, userLogoutPath } from '../../api-paths';
import classes from './profileMenu.module.css';
import { useParams } from 'react-router-dom';

export interface IProfileMenuComponentProps {
  showlogout?: boolean;
}

export function ProfileMenu({ showlogout }: IProfileMenuComponentProps) {
  const [anchorEl, setAnchorEl] = useState<null | Element>(null);
  const { org, app } = useParams();
  const handleClick = (event: any) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);
  const handleLogout = () =>
    post(userLogoutPath())
      .then(() => window.location.assign(userLogoutAfterPath()))
      .finally(() => true);
  return (
    <div>
      <IconButton
        aria-owns={anchorEl ? 'simple-menu' : undefined}
        aria-haspopup='true'
        aria-label='profilikon knapp'
        onClick={handleClick}
      >
        <AccountCircle fontSize='large' titleAccess='profilikon' aria-label='profilikon' />
      </IconButton>
      <Menu
        id='simple-menu'
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        anchorReference='none'
        elevation={1}
        classes={{ paper: classes.paperStyle }}
      >
        <MenuItem key='placeholder' style={{ display: 'none' }} />
        {
          // workaround for highlighted menu item not changing.
          // https://github.com/mui-org/material-ui/issues/5186#issuecomment-337278330
        }
        {org && app && (
          <MenuItem className={classes.menuItem}>
            <a href={repositoryPath(org, app)} target='_blank' rel='noopener noreferrer'>
              Åpne repository
            </a>
          </MenuItem>
        )}
        <MenuItem className={classes.menuItem}>
          <a href={altinnDocsUrl()} target='_blank' rel='noopener noreferrer'>
            Dokumentasjon
          </a>
        </MenuItem>
        {showlogout && (
          <MenuItem onClick={handleLogout} className={classes.menuItem}>
            Logout
          </MenuItem>
        )}
      </Menu>
    </div>
  );
}
