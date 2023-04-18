import React, { useState } from 'react';
import classes from './profileMenu.module.css';
import { Menu, MenuItem } from '@mui/material';
import { altinnDocsUrl } from 'app-shared/ext-urls';
import { post } from '../../utils/networking';
import { repositoryPath, userLogoutAfterPath, userLogoutPath } from '../../api-paths';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export interface IProfileMenuComponentProps {
  showlogout?: boolean;
}

export function ProfileMenu({ showlogout }: IProfileMenuComponentProps) {
  const [anchorEl, setAnchorEl] = useState<null | Element>(null);
  const { org, app } = useParams();
  const handleClick = (event: any) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);
  const { t } = useTranslation();
  const handleLogout = () =>
    post(userLogoutPath())
      .then(() => window.location.assign(userLogoutAfterPath()))
      .finally(() => true);

  return (
    <div>
      <img
        // url should be moved from her ...
        src={'https://secure.gravatar.com/avatar/2cce393ac67a2a151bd3c0cb81dc65ba?d=identicon'}
        className={classes.userAvatar}
        aria-haspopup
        onClick={handleClick}
      />
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
              {t('dashboard.open_repository')}
            </a>
          </MenuItem>
        )}
        <MenuItem className={classes.menuItem}>
          <a href={altinnDocsUrl()} target='_blank' rel='noopener noreferrer'>
            {t('sync_header.documentation')}
          </a>
        </MenuItem>
        {showlogout && (
          <MenuItem onClick={handleLogout} className={classes.menuItem}>
            {t('shared.header_logout')}
          </MenuItem>
        )}
      </Menu>
    </div>
  );
}
