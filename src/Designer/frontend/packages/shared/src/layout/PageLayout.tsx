import React from 'react';
import type { ReactElement, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioAvatar, StudioPageHeader } from '@studio/components';
import type { StudioProfileMenuGroup } from '@studio/components';
import { useMediaQuery } from '@studio/components-legacy';
import { MEDIA_QUERY_MAX_WIDTH } from 'app-shared/constants';
import type { User } from 'app-shared/types/Repository';
import { SharedSmallHeaderMenu } from './SharedSmallHeaderMenu';
import { altinnDocsUrl } from 'app-shared/ext-urls';
import { useLogoutMutation } from 'app-shared/hooks/mutations/useLogoutMutation';

type PageLayoutProps = {
  user: User;
  profileMenuGroups?: StudioProfileMenuGroup[];
  triggerButtonText?: string;
  profileMenuFooter?: ReactNode;
  title?: string;
  centerContent?: ReactNode;
  subContent?: ReactNode;
  children: ReactNode;
};

export function PageLayout({
  user,
  profileMenuGroups,
  triggerButtonText,
  profileMenuFooter,
  title,
  centerContent,
  subContent,
  children,
}: PageLayoutProps): ReactElement {
  const isSmallScreen = useMediaQuery(MEDIA_QUERY_MAX_WIDTH);
  const shouldDisplayDesktopMenu = !isSmallScreen;

  return (
    <div data-color-scheme='dark'>
      <StudioPageHeader>
        <StudioPageHeader.Main>
          <StudioPageHeader.Left title={title} showTitle={shouldDisplayDesktopMenu} />
          {shouldDisplayDesktopMenu && centerContent && (
            <StudioPageHeader.Center>{centerContent}</StudioPageHeader.Center>
          )}
          <StudioPageHeader.Right>
            {isSmallScreen ? (
              <SharedSmallHeaderMenu user={user} profileMenuGroups={profileMenuGroups} />
            ) : (
              <ProfileMenu
                user={user}
                profileMenuGroups={profileMenuGroups}
                triggerButtonText={triggerButtonText}
                profileMenuFooter={profileMenuFooter}
              />
            )}
          </StudioPageHeader.Right>
        </StudioPageHeader.Main>
        {subContent && <StudioPageHeader.Sub>{subContent}</StudioPageHeader.Sub>}
      </StudioPageHeader>
      {children}
    </div>
  );
}

type ProfileMenuProps = {
  user: User;
  profileMenuGroups?: StudioProfileMenuGroup[];
  triggerButtonText?: string;
  profileMenuFooter?: ReactNode;
};

function ProfileMenu({
  user,
  profileMenuGroups,
  triggerButtonText,
  profileMenuFooter,
}: ProfileMenuProps): ReactElement {
  const { t } = useTranslation();
  const { mutate: logout } = useLogoutMutation();

  const resolvedTriggerButtonText = triggerButtonText ?? user?.full_name ?? user?.login;

  const defaultProfileMenuGroups: StudioProfileMenuGroup[] = [
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
      triggerButtonText={resolvedTriggerButtonText}
      profileImage={
        <StudioAvatar
          src={user?.avatar_url}
          alt={t('general.profile_icon')}
          title={t('shared.header_profile_icon_text')}
        />
      }
      profileMenuGroups={[...profileMenuGroups, ...defaultProfileMenuGroups]}
      profileMenuFooter={profileMenuFooter}
    />
  );
}
