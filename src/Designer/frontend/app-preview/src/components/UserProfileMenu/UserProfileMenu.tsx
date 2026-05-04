import type { ReactElement } from 'react';
import { type Repository, type User } from 'app-shared/types/Repository';
import { useTranslation } from 'react-i18next';
import { useUserNameAndOrg } from 'app-shared/hooks/useUserNameAndOrg';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useMediaQuery } from '@studio/components-legacy';
import {
  StudioPageHeader,
  StudioAvatar,
  type StudioProfileMenuItem,
  type StudioProfileMenuGroup,
} from '@studio/components';
import { MEDIA_QUERY_MAX_WIDTH, SETTINGS_BASENAME } from 'app-shared/constants';
import { useLogoutMutation } from 'app-shared/hooks/mutations/useLogoutMutation';
import { altinnDocsUrl } from 'app-shared/ext-urls';
import { useEnvironmentConfig } from 'app-shared/contexts/EnvironmentConfigContext';
import { FeatureFlag, useFeatureFlag } from '@studio/feature-flags';

export type UserProfileMenuProps = {
  user: User;
  repository: Repository;
};

export const UserProfileMenu = ({ user, repository }: UserProfileMenuProps): ReactElement => {
  const { t } = useTranslation();
  const { org } = useStudioEnvironmentParams();
  const userNameAndOrg = useUserNameAndOrg(user, org, repository);
  const shouldDisplayText = !useMediaQuery(MEDIA_QUERY_MAX_WIDTH);
  const { mutate: logout } = useLogoutMutation();
  const { environment } = useEnvironmentConfig();
  const studioOidc = environment?.featureFlags?.studioOidc;
  const isAdminEnabled = useFeatureFlag(FeatureFlag.Admin);
  const showSettingsLink = studioOidc || isAdminEnabled;

  const docsMenuItem: StudioProfileMenuItem = {
    action: { type: 'link', href: altinnDocsUrl() },
    itemName: t('sync_header.documentation'),
  };

  const settingsMenuItem: StudioProfileMenuItem = {
    action: {
      type: 'link',
      href: `${SETTINGS_BASENAME}/${org}`,
      openInNewTab: false,
    },
    itemName: t('settings'),
  };

  const logOutMenuItem: StudioProfileMenuItem = {
    action: { type: 'button', onClick: logout },
    itemName: t('shared.header_logout'),
  };

  const profileMenuGroups: StudioProfileMenuGroup[] = [
    ...(showSettingsLink ? [{ items: [settingsMenuItem] }] : []),
    { items: [docsMenuItem] },
    { items: [logOutMenuItem] },
  ];

  return (
    <StudioPageHeader.ProfileMenu
      triggerButtonText={shouldDisplayText ? userNameAndOrg : undefined}
      profileImage={
        <StudioAvatar
          src={user?.avatar_url}
          alt={t('general.profile_icon')}
          title={t('shared.header_profile_icon_text')}
        />
      }
      profileMenuGroups={profileMenuGroups}
    />
  );
};
