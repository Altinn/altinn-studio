import React, { type ReactElement } from 'react';
import { type Repository, type User } from 'app-shared/types/Repository';
import { useTranslation } from 'react-i18next';
import { useUserNameAndOrg } from './hooks/useUserNameAndOrg';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import {
  type StudioProfileMenuItem,
  useMediaQuery,
  StudioProfileMenu,
  StudioAvatar,
  type StudioProfileMenuProps,
} from '@studio/components';
import { altinnDocsUrl } from 'app-shared/ext-urls';
import { MEDIA_QUERY_MAX_WIDTH } from 'app-shared/constants';
import { useLogoutMutation } from 'app-shared/hooks/mutations/useLogoutMutation';

export type AppUserProfileMenuProps = {
  user: User;
  repository: Repository;
  color: StudioProfileMenuProps['color']; // TODO - See if we can do this with "StudioProfileMenuItem" too
};

export const AppUserProfileMenu = ({
  user,
  repository,
  color,
}: AppUserProfileMenuProps): ReactElement => {
  const { t } = useTranslation();
  const { org } = useStudioEnvironmentParams();
  const userNameAndOrg = useUserNameAndOrg(user, org, repository);
  const { mutate: logout } = useLogoutMutation();

  const shouldDisplayText = !useMediaQuery(MEDIA_QUERY_MAX_WIDTH);

  const docsMenuItem: StudioProfileMenuItem = {
    action: { type: 'link', href: altinnDocsUrl('') },
    itemName: t('sync_header.documentation'),
    hasDivider: true,
  };

  const logOutMenuItem: StudioProfileMenuItem = {
    action: { type: 'button', onClick: logout },
    itemName: t('shared.header_logout'),
  };

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
      profileMenuItems={[docsMenuItem, logOutMenuItem]}
      color={color}
    />
  );
};
