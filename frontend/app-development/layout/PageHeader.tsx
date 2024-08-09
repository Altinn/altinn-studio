import React, { type ReactNode, type ReactElement } from 'react';
import { getFilteredTopBarMenu } from './AppBar/appBarConfig';
import { getRepositoryType } from 'app-shared/utils/repository';
import { GiteaHeader } from 'app-shared/components/GiteaHeader';
import { SettingsModalButton } from './SettingsModalButton';
import { TopBarGroup, TopBarMenu } from 'app-shared/enums/TopBarMenu';
import type { Repository, User } from 'app-shared/types/Repository';
import { PackagesRouter } from 'app-shared/navigation/PackagesRouter';
import { RepositoryType } from 'app-shared/types/global';
import { useSelectedFormLayoutSetName, useSelectedFormLayoutName } from '@altinn/ux-editor/hooks';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { usePreviewContext } from 'app-development/contexts/PreviewContext';
import { StudioPageHeader, useIsSmallWidth } from '@studio/components';
import { useRepoMetadataQuery } from 'app-shared/hooks/queries';
import { AltinnHeaderMenu } from 'app-shared/components/altinnHeaderMenu';
import { type TopBarMenuDeploymentItem } from 'app-shared/types/TopBarMenuItem';
import { RoutePaths } from 'app-development/enums/RoutePaths';
import { useUserNameAndOrg } from 'app-shared/components/AltinnHeaderProfile/hooks/useUserNameAndOrg';
import {} from //type ProfileMenuItem,
//ProfileMenuNew,
'app-shared/navigation/main-header/ProfileMenu/ProfileMenu';
import { repositoryPath, userLogoutAfterPath, userLogoutPath } from 'app-shared/api/paths';
import { altinnDocsUrl } from 'app-shared/ext-urls';
import { useTranslation } from 'react-i18next';
import { post } from 'app-shared/utils/networking';
import { StudioProfileMenu, type StudioProfileMenuItem } from '@studio/components';

const WINDOW_RESIZE_WIDTH = 1000;

type SubMenuContentProps = {
  hasRepoError?: boolean;
};

export const SubMenuContent = ({ hasRepoError }: SubMenuContentProps): ReactElement => {
  const { org, app } = useStudioEnvironmentParams();
  const repositoryType = getRepositoryType(org, app);
  const { doReloadPreview } = usePreviewContext();

  return (
    <GiteaHeader
      hasCloneModal
      leftComponent={repositoryType !== RepositoryType.DataModels && <SettingsModalButton />}
      hasRepoError={hasRepoError}
      onPullSuccess={doReloadPreview}
    />
  );
};

export const getDeploymentButtonItems = (
  org: string,
  app: string,
  selectedFormLayoutName: string,
): TopBarMenuDeploymentItem[] => {
  const packagesRouter = new PackagesRouter({ org, app });

  return [
    {
      key: TopBarMenu.Preview,
      link: `${packagesRouter.getPackageNavigationUrl('preview')}${selectedFormLayoutName ? `?layout=${selectedFormLayoutName}` : ''}`,
      group: TopBarGroup.Deployment,
      isInverted: true,
    },
    {
      key: TopBarMenu.Deploy,
      link: RoutePaths.Deploy,
      group: TopBarGroup.Deployment,
    },
  ];
};

type PageHeaderProps = {
  showSubMenu: boolean;
  user: User;
  repoOwnerIsOrg: boolean;
  isRepoError?: boolean;
};

export const PageHeader = ({ showSubMenu, user, repoOwnerIsOrg, isRepoError }: PageHeaderProps) => {
  const { org, app } = useStudioEnvironmentParams();
  const repoType = getRepositoryType(org, app);
  const { data: repository } = useRepoMetadataQuery(org, app);

  const menuItems = getFilteredTopBarMenu(repoType);

  const { selectedFormLayoutSetName } = useSelectedFormLayoutSetName();
  const { selectedFormLayoutName } = useSelectedFormLayoutName(selectedFormLayoutSetName);

  return (
    <StudioPageHeader>
      <StudioPageHeader.Main variant='regular'>
        <StudioPageHeader.Left title={app} />
        <StudioPageHeader.Center>
          {menuItems && (
            <AltinnHeaderMenu
              menuItems={menuItems}
              windowResizeWidth={WINDOW_RESIZE_WIDTH}
              repoOwnerIsOrg={repoOwnerIsOrg}
              deploymentItems={
                !isRepoError && getDeploymentButtonItems(org, app, selectedFormLayoutName)
              }
            />
          )}
        </StudioPageHeader.Center>
        <StudioPageHeader.Right>
          <ProfileMenu user={user} repository={repository} showLogout={true} />
        </StudioPageHeader.Right>
      </StudioPageHeader.Main>
      {(showSubMenu || !isRepoError) && (
        <StudioPageHeader.Sub>
          <SubMenuContent hasRepoError={isRepoError} />
        </StudioPageHeader.Sub>
      )}
    </StudioPageHeader>
  );
};

type ProfileMenuProps = {
  user: User;
  showLogout?: boolean;
  repository: Repository;
};

const ProfileMenu = ({ user, showLogout, repository }: ProfileMenuProps): ReactNode => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const userNameAndOrg = useUserNameAndOrg(user, org, repository);

  const isSmallWidth = useIsSmallWidth(WINDOW_RESIZE_WIDTH);

  // TODO Fix
  const handleLogout = () =>
    post(userLogoutPath())
      .then(() => window.location.assign(userLogoutAfterPath()))
      .finally(() => true);

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
  };

  const logOutMenuItem: StudioProfileMenuItem[] = showLogout
    ? [
        {
          action: { type: 'button', onClick: handleLogout },
          itemName: t('shared.header_logout'),
        },
      ]
    : [];

  return (
    <StudioProfileMenu
      triggerButtonText={isSmallWidth ? undefined : userNameAndOrg}
      /*profileImage={
        <img
          alt={t('general.profile_icon')}
          title={t('shared.header_profile_icon_text')}
          // className={classes.userAvatar}
          src={user.avatar_url}
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '30px',
          }}
        />
      }*/
      profileMenuItems={[...openRepositoryElement, docsMenuItem, ...logOutMenuItem]}
    />
  );
};
