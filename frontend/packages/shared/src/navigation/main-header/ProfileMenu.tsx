import React, { useState } from 'react';
import classes from './ProfileMenu.module.css';
import { Menu, MenuItem } from '@mui/material';
import { altinnDocsUrl } from 'app-shared/ext-urls';
import { post } from '../../utils/networking';
import { repositoryPath, userLogoutAfterPath, userLogoutPath } from '../../api/paths';
import { useTranslation } from 'react-i18next';
import { User } from 'app-shared/types/User';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';

export interface IProfileMenuComponentProps {
  showlogout?: boolean;
  user: User;
}

export function ProfileMenu({ showlogout, user }: IProfileMenuComponentProps) {
  const [anchorEl, setAnchorEl] = useState<null | Element>(null);
  const { org, app } = useStudioUrlParams();
  const handleClick = (event: any) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);
  const { t } = useTranslation();
  const handleLogout = () =>
    post(userLogoutPath())
      .then(() => window.location.assign(userLogoutAfterPath()))
      .finally(() => true);

  return (
    <div className={classes.previewProfilIcon}>
      <img
        alt={t('general.profile_icon')}
        aria-haspopup
        className={classes.userAvatar}
        onClick={handleClick}
        src={user.avatar_url}
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
          <a href={altinnDocsUrl('')} target='_blank' rel='noopener noreferrer'>
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
