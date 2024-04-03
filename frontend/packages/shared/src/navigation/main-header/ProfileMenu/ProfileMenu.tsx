import type { ReactNode } from 'react';
import React, { useEffect, useRef, useState } from 'react';
import classes from './ProfileMenu.module.css';
import { Menu, MenuItem } from '@mui/material';
import { altinnDocsUrl } from 'app-shared/ext-urls';
import { post } from '../../../utils/networking';
import { repositoryPath, userLogoutAfterPath, userLogoutPath } from '../../../api/paths';
import { useTranslation } from 'react-i18next';
import type { User } from 'app-shared/types/Repository';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { StudioButton } from '@studio/components';
import * as testids from '../../../../../../testing/testids';

export interface IProfileMenuComponentProps {
  showlogout?: boolean;
  user: User;
  userNameAndOrg: string;
  repositoryError?: boolean;
}

/**
 * @component
 *    Displays the menu in the Altinn Header
 *
 * @property {boolean}[showlogout] - Optional flag for if logout button should be shown
 * @property {User}[user] - The user
 * @property {string}[userNameAndOrg] - The username and org string to display in the header
 *
 * @returns {ReactNode} - The rendered component
 */
export const ProfileMenu = ({
  showlogout,
  user,
  userNameAndOrg,
  repositoryError,
}: IProfileMenuComponentProps): ReactNode => {
  const menuRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const { org, app } = useStudioUrlParams();

  const handleClick = (event: any) => setMenuOpen(true);
  const handleClose = () => setMenuOpen(false);
  const { t } = useTranslation();
  const handleLogout = () =>
    post(userLogoutPath())
      .then(() => window.location.assign(userLogoutAfterPath()))
      .finally(() => true);

  /**
   * Closes the menu when clicking outside the menu
   */
  const handleClickOutside = (e: MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(e.target)) {
      handleClose();
    }
  };

  /**
   * Closes the menu when clicking the ESCAPE key
   */
  const handleEscapeKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') handleClose();
  };

  /**
   * Listens to the events of clicking outside or using the keys on the menu
   */
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => handleClickOutside(e);
    const handleKeydown = (e: KeyboardEvent) => handleEscapeKey(e);

    document.addEventListener('click', handleOutsideClick);
    document.addEventListener('keydown', handleKeydown);

    return () => {
      document.removeEventListener('click', handleOutsideClick);
      document.removeEventListener('keydown', handleKeydown);
    };
  });

  return (
    <StudioButton
      variant='tertiary'
      color='inverted'
      onClick={handleClick}
      data-testid={testids.profileButton}
      aria-haspopup
      ref={menuRef}
    >
      <span className={classes.userOrgNames}>{userNameAndOrg}</span>
      <img
        alt={t('general.profile_icon')}
        title={t('shared.header_profile_icon_text')}
        className={classes.userAvatar}
        src={user.avatar_url}
      />
      <Menu
        id='simple-menu'
        open={menuOpen}
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
        {org && app && !repositoryError && (
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
    </StudioButton>
  );
};
