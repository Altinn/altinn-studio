import { MEDIA_QUERY_MAX_WIDTH } from 'app-shared/constants';
import type { Org } from 'app-shared/types/OrgList';
import type { StudioProfileMenuGroup } from '@studio/components-legacy';
import { StudioAvatar, StudioPageHeader, useMediaQuery } from '@studio/components-legacy';
import type { ReactElement } from 'react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { User } from 'app-shared/types/Repository';
import { useLogoutMutation } from 'app-shared/hooks/mutations/useLogoutMutation';
import { altinnDocsUrl } from 'app-shared/ext-urls';
import { NavLink } from 'react-router-dom';

type PageHeaderProps = {
  org: Org;
  user: User;
};

export const PageHeader = ({ org, user }: PageHeaderProps): ReactElement => {
  const shouldDisplayDesktopMenu = !useMediaQuery(MEDIA_QUERY_MAX_WIDTH);
  const { i18n } = useTranslation();

  return (
    <StudioPageHeader>
      <StudioPageHeader.Main>
        <StudioPageHeader.Left
          showTitle={shouldDisplayDesktopMenu}
          title={org.name[i18n.language]}
        />
        {shouldDisplayDesktopMenu && <CenterContent />}
        <StudioPageHeader.Right>
          <ProfileMenu org={org} user={user} />
        </StudioPageHeader.Right>
      </StudioPageHeader.Main>
    </StudioPageHeader>
  );
};

const CenterContent = (): ReactElement => {
  const { t } = useTranslation();

  return (
    <StudioPageHeader.Center>
      <StudioPageHeader.HeaderLink
        color='dark'
        variant='regular'
        renderLink={(props) => (
          <NavLink to={'/'} {...props}>
            <span>{t('Oversikt')}</span>
          </NavLink>
        )}
      />
    </StudioPageHeader.Center>
  );
};

type ProfileMenuProps = {
  org: Org;
  user: User;
};

const ProfileMenu = ({ user, org }: ProfileMenuProps): ReactElement => {
  const { t, i18n } = useTranslation();

  const userNameAndOrg = t('shared.header_user_for_org', {
    user: user.full_name || user.login,
    org: org.name[i18n.language],
  });

  const { mutate: logout } = useLogoutMutation();

  const profileMenuGroups: StudioProfileMenuGroup[] = [
    {
      items: [
        {
          action: { type: 'link', href: altinnDocsUrl() },
          itemName: t('sync_header.documentation'),
        },
      ],
    },
    {
      items: [
        {
          action: { type: 'button', onClick: logout },
          itemName: t('shared.header_logout'),
        },
      ],
    },
  ];

  return (
    <StudioPageHeader.ProfileMenu
      profileMenuGroups={profileMenuGroups}
      triggerButtonText={userNameAndOrg}
      ariaLabelTriggerButton={userNameAndOrg}
      profileImage={
        <StudioAvatar
          src={user?.avatar_url}
          alt={t('general.profile_icon')}
          title={t('shared.header_profile_icon_text')}
        />
      }
      color='dark'
      variant={'regular'}
    />
  );
};
