import React, { type ReactElement } from 'react';
import { getFilteredTopBarMenu } from './AppBar/appBarConfig';
import { getRepositoryType } from 'app-shared/utils/repository';
import { GiteaHeader } from 'app-shared/components/GiteaHeader';
import { SettingsModalButton } from './SettingsModalButton';
import { TopBarGroup, TopBarMenu } from 'app-shared/enums/TopBarMenu';
import type { User } from 'app-shared/types/Repository';
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
import { AppUserProfileMenu } from 'app-shared/components/AppUserProfileMenu';

const WINDOW_RESIZE_WIDTH = 900;

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

// TODO MOVE TO OTHER FILE
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

  const isSmallWidth = useIsSmallWidth(WINDOW_RESIZE_WIDTH);

  return (
    <StudioPageHeader>
      <StudioPageHeader.Main>
        <StudioPageHeader.Left title={app} showOnlyLogo={isSmallWidth} />
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
          <AppUserProfileMenu user={user} repository={repository} />
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
