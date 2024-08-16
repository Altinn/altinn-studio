import React, { type ReactElement } from 'react';
import classes from './AppUserProfileMenu.module.css';
import { type Repository, type User } from 'app-shared/types/Repository';
import { useTranslation } from 'react-i18next';
import { useUserNameAndOrg } from './hooks/useUserNameAndOrg';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { type StudioProfileMenuItem, useMediaQuery, StudioProfileMenu } from '@studio/components';
import { repositoryPath, userLogoutAfterPath, userLogoutPath } from 'app-shared/api/paths';
import { altinnDocsUrl } from 'app-shared/ext-urls';
import { post } from 'app-shared/utils/networking';
import { WINDOW_RESIZE_WIDTH } from 'app-shared/utils/resizeUtils';

export type AppUserProfileMenuProps = {
  user: User;
  repository: Repository;
  color: 'dark' | 'light'; // TODO - Should this be a type from StudioComponents?
};

export const AppUserProfileMenu = ({
  user,
  repository,
  color,
}: AppUserProfileMenuProps): ReactElement => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const userNameAndOrg = useUserNameAndOrg(user, org, repository);

  const shouldResizeWindow = useMediaQuery(`(max-width: ${WINDOW_RESIZE_WIDTH}px)`);

  const openRepositoryElement: StudioProfileMenuItem[] =
    org && app && repository
      ? [
          {
            action: { type: 'link', href: repositoryPath(org, app) },
            itemName: t('dashboard.open_repository'),
          },
        ]
      : [];

  const docsMenuItem: StudioProfileMenuItem = {
    action: { type: 'link', href: altinnDocsUrl('') },
    itemName: t('sync_header.documentation'),
    hasDivider: true,
  };

  // TODO Fix
  const handleLogout = () =>
    // TODO - Can we refactor this to a shared function???
    post(userLogoutPath())
      .then(() => window.location.assign(userLogoutAfterPath()))
      .finally(() => true);

  const logOutMenuItem: StudioProfileMenuItem = {
    action: { type: 'button', onClick: handleLogout },
    itemName: t('shared.header_logout'),
  };

  return (
    <StudioProfileMenu
      triggerButtonText={shouldResizeWindow ? undefined : userNameAndOrg}
      profileImage={
        user?.avatar_url && (
          <img
            alt={t('general.profile_icon')}
            title={t('shared.header_profile_icon_text')}
            className={classes.userAvatar}
            src={user.avatar_url}
          />
        )
      }
      profileMenuItems={[...openRepositoryElement, docsMenuItem, logOutMenuItem]}
      color={color}
    />
  );
};
