import React, { type ReactElement } from 'react';
import { type Repository, type User } from 'app-shared/types/Repository';
import { useTranslation } from 'react-i18next';
import { useUserNameAndOrg } from './hooks/useUserNameAndOrg';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import {
  useMediaQuery,
  StudioProfileMenu,
  StudioAvatar,
  type StudioProfileMenuProps,
} from '@studio/components';
import { MEDIA_QUERY_MAX_WIDTH } from 'app-shared/constants';

export type AppUserProfileMenuProps = {
  user: User;
  repository: Repository;
  color: StudioProfileMenuProps['color']; // TODO - See if we can do this with "StudioProfileMenuItem" too
  variant: StudioProfileMenuProps['variant'];
  profileMenuItems: StudioProfileMenuProps['profileMenuItems'];
};

export const AppUserProfileMenu = ({
  user,
  repository,
  color,
  variant,
  profileMenuItems,
}: AppUserProfileMenuProps): ReactElement => {
  const { t } = useTranslation();
  const { org } = useStudioEnvironmentParams();
  const userNameAndOrg = useUserNameAndOrg(user, org, repository);
  const shouldDisplayText = !useMediaQuery(MEDIA_QUERY_MAX_WIDTH);

  return (
    <StudioProfileMenu
      triggerButtonText={shouldDisplayText ? userNameAndOrg : undefined}
      profileImage={
        <StudioAvatar
          imageDetails={
            user?.avatar_url && {
              src: user.avatar_url,
              alt: t('general.profile_icon'),
              title: t('shared.header_profile_icon_text'),
            }
          }
        />
      }
      profileMenuItems={profileMenuItems}
      color={color}
      variant={variant}
    />
  );
};
