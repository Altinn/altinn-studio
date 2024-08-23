import React, { type ReactElement } from 'react';
import {
  getTopBarMenuItems,
  groupMenuItemsByGroup,
} from 'app-development/utils/headerMenu/headerMenuUtils';
import { getRepositoryType } from 'app-shared/utils/repository';
import type { User } from 'app-shared/types/Repository';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { StudioPageHeader, type StudioProfileMenuItem, useMediaQuery } from '@studio/components';
import { useRepoMetadataQuery } from 'app-shared/hooks/queries';
// TODO DELETE - import { HeaderMenu } from './HeaderMenu';
import { AppUserProfileMenu } from 'app-shared/components/AppUserProfileMenu';
import { SubHeader } from './SubHeader';
import { MEDIA_QUERY_MAX_WIDTH } from 'app-shared/constants';
import { type NavigationMenuSmallGroup } from 'app-development/types/HeaderMenu/NavigationMenuSmallGroup';
import { SmallNavigationMenu } from './SmallNavigationMenu';
import { type HeaderMenuGroup } from 'app-development/types/HeaderMenu/HeaderMenuGroup';
import { type HeaderMenuItem } from 'app-development/types/HeaderMenu/HeaderMenuItem';
import { HeaderMenuGroupKey } from 'app-development/enums/HeaderMenuGroupKey';
import { MenuHamburgerIcon } from '@studio/icons';
import { useTranslation } from 'react-i18next';
import { altinnDocsUrl } from 'app-shared/ext-urls';
import { post } from 'app-shared/utils/networking';
import { userLogoutAfterPath, userLogoutPath } from 'app-shared/api/paths';
import { useUserNameAndOrg } from 'app-shared/components/AppUserProfileMenu/hooks/useUserNameAndOrg';
import { LargeNavigationMenu } from './LargeNavigationMenu';

type PageHeaderProps = {
  showSubMenu: boolean;
  user: User;
  repoOwnerIsOrg: boolean;
  isRepoError?: boolean;
};

export const PageHeader = ({
  showSubMenu,
  user,
  repoOwnerIsOrg,
  isRepoError,
}: PageHeaderProps): ReactElement => {
  const { org, app } = useStudioEnvironmentParams();
  const repoType = getRepositoryType(org, app);
  const { t } = useTranslation();

  const shouldDisplaySmallMenu = useMediaQuery(MEDIA_QUERY_MAX_WIDTH);
  const shouldDisplayText = !shouldDisplaySmallMenu;

  const menuItems = getTopBarMenuItems(repoType, repoOwnerIsOrg);

  // TODO
  const docsMenuItem: StudioProfileMenuItem = {
    action: { type: 'link', href: altinnDocsUrl(''), openInNewTab: true },
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
    <StudioPageHeader>
      <StudioPageHeader.Main>
        <StudioPageHeader.Left title={shouldDisplayText && app} />
        {!shouldDisplaySmallMenu && (
          <StudioPageHeader.Center>
            {menuItems && (
              <LargeNavigationMenu
                // TODO FUNCTION
                menuItems={menuItems.map((menuItem: HeaderMenuItem) => ({
                  link: menuItem.link,
                  name: t(menuItem.key),
                  isBeta: menuItem.isBeta,
                }))}
              />
            )}
          </StudioPageHeader.Center>
        )}
        <StudioPageHeader.Right>
          <RightContent
            user={user}
            menuItems={menuItems}
            profileMenuItems={[docsMenuItem, logOutMenuItem]}
          />
        </StudioPageHeader.Right>
      </StudioPageHeader.Main>
      {(showSubMenu || !isRepoError) && (
        <StudioPageHeader.Sub>
          <SubHeader hasRepoError={isRepoError} />
        </StudioPageHeader.Sub>
      )}
    </StudioPageHeader>
  );
};

type RightContentProps = {
  user: User;
  menuItems: HeaderMenuItem[];
  profileMenuItems: StudioProfileMenuItem[]; // TODO
};

const RightContent = ({ user, menuItems, profileMenuItems }: RightContentProps): ReactElement => {
  const { org, app } = useStudioEnvironmentParams();
  const { data: repository } = useRepoMetadataQuery(org, app);
  const isSmallScreen = useMediaQuery(MEDIA_QUERY_MAX_WIDTH);

  if (isSmallScreen) {
    return (
      <SmallHeaderMenu menuItems={menuItems} profileMenuItems={profileMenuItems} user={user} />
    );
  }
  return <AppUserProfileMenu user={user} repository={repository} color='dark' />;
};

type SmallHeaderMenuProps = {
  menuItems: HeaderMenuItem[];
  profileMenuItems: StudioProfileMenuItem[]; // TODO
  user: User; // TODO
};
const SmallHeaderMenu = ({ menuItems, profileMenuItems, user }: SmallHeaderMenuProps) => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { data: repository } = useRepoMetadataQuery(org, app);
  const userNameAndOrg = useUserNameAndOrg(user, org, repository);

  const groupedMenuItems: HeaderMenuGroup[] = groupMenuItemsByGroup(menuItems);

  const profileMenuGroup: NavigationMenuSmallGroup = {
    name: userNameAndOrg,
    showName: true,
    items: profileMenuItems.map((item: StudioProfileMenuItem) => ({
      name: item.itemName,
      action: item.action,
    })),
  };

  return (
    <SmallNavigationMenu
      menuGroups={[...groupedMenuItems.map(mapHeaderMenuGroupToNavigationMenu), profileMenuGroup]}
      anchorButtonProps={{
        icon: <MenuHamburgerIcon />,
        variant: 'tertiary',
        color: 'inverted',
        children: t('top_menu.menu'),
      }}
    />
  );
};

const mapHeaderMenuGroupToNavigationMenu = (
  menuGroup: HeaderMenuGroup,
): NavigationMenuSmallGroup => ({
  name: menuGroup.groupName,
  showName: menuGroup.groupName === HeaderMenuGroupKey.Tools,
  items: menuGroup.menuItems.map((menuItem: HeaderMenuItem) => ({
    action: {
      type: 'link',
      href: menuItem.link,
    },
    name: menuItem.key,
    isBeta: menuItem.isBeta,
  })),
});

/*
Men hva med disse 3 gruppene da?
  - Oversikt
  - Verktøy
    - Lage
    - Datamodell
    - Språk
    - Prosess (beta)
  - Brukernavn for org
    - Dokumentasjon
    - Logg ut

da er "brukernacn for org" samme tekst som står der til vanlig

Supert! så har vi jo de casene hvor brukernavnet for org blir veldig langt :slightly_smiling_face:
så kanskje begrense mkas ord der, også vise hele navnet når man hovrer over, slik som vi gjorde med lange id navn?
*/
