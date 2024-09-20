import React, { type ReactElement } from 'react';
import { type Repository, type User } from 'app-shared/types/Repository';
import { useTranslation } from 'react-i18next';
import { useUserNameAndOrg } from 'app-shared/components/AltinnHeaderProfile/hooks/useUserNameAndOrg';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import {
  useMediaQuery,
  StudioProfileMenu,
  StudioAvatar,
  type StudioProfileMenuProps,
} from '@studio/components';
import { MEDIA_QUERY_MAX_WIDTH } from 'app-shared/constants';

const TRUNCATE_APP_USERNAME = 30;

export type UserProfileMenuProps = {
  user: User;
  repository: Repository;
  color: StudioProfileMenuProps['color'];
  variant: StudioProfileMenuProps['variant'];
  profileMenuItems: StudioProfileMenuProps['profileMenuItems'];
};

export const UserProfileMenu = ({
  user,
  repository,
  color,
  variant,
  profileMenuItems,
}: UserProfileMenuProps): ReactElement => {
  const { t } = useTranslation();
  const { org } = useStudioEnvironmentParams();
  const userNameAndOrg = useUserNameAndOrg(user, org, repository);
  const shouldDisplayText = !useMediaQuery(MEDIA_QUERY_MAX_WIDTH);

  return (
    <StudioProfileMenu
      triggerButtonText={shouldDisplayText ? userNameAndOrg : undefined}
      ariaLabelTriggerButton={userNameAndOrg}
      profileImage={
        <StudioAvatar
          src={user?.avatar_url ? user.avatar_url : undefined}
          alt={t('general.profile_icon')}
          title={t('shared.header_profile_icon_text')}
        />
      }
      profileMenuItems={profileMenuItems}
      color={color}
      variant={variant}
      truncateAt={TRUNCATE_APP_USERNAME}
    />
  );
};
