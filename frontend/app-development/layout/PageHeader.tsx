import React from 'react';
import { AltinnHeader } from 'app-shared/components/altinnHeader/AltinnHeader';
import { getFilteredTopBarMenu } from './AppBar/appBarConfig';
import { getRepositoryType } from 'app-shared/utils/repository';
import type { AltinnButtonActionItem } from 'app-shared/components/altinnHeader/types';
import { GiteaHeader } from 'app-shared/components/GiteaHeader';
import { SettingsModalButton } from './SettingsModalButton';
import { TopBarGroup, TopBarMenu } from 'app-shared/enums/TopBarMenu';
import type { User } from 'app-shared/types/Repository';
import { PackagesRouter } from 'app-shared/navigation/PackagesRouter';
import { RepositoryType } from 'app-shared/types/global';
import { useSelectedFormLayoutSetName, useSelectedFormLayoutName } from '@altinn/ux-editor/hooks';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { usePreviewContext } from 'app-development/contexts/PreviewContext';
import { StudioPageHeader } from '@studio/components';
import { useRepoMetadataQuery } from 'app-shared/hooks/queries';
import { AltinnHeaderMenu } from 'app-shared/components/altinnHeaderMenu';
import { type TopBarMenuDeploymentItem } from 'app-shared/types/TopBarMenuItem';
import { RoutePaths } from 'app-development/enums/RoutePaths';

const WINDOW_RESIZE_WIDTH = 1000;

type SubMenuContentProps = {
  hasRepoError?: boolean;
};

export const SubMenuContent = ({ hasRepoError }: SubMenuContentProps): React.ReactElement => {
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

// MOVE THESE INTO SEPARATE FILE
export const buttonActionsOld = (
  org: string,
  app: string,
  selectedFormLayoutName: string,
): AltinnButtonActionItem[] => {
  const packagesRouter = new PackagesRouter({ org, app });

  return [
    {
      menuKey: TopBarMenu.Preview,
      to: `${packagesRouter.getPackageNavigationUrl('preview')}${selectedFormLayoutName ? `?layout=${selectedFormLayoutName}` : ''}`,
      isInverted: true,
    },
    {
      menuKey: TopBarMenu.Deploy,
      to: packagesRouter.getPackageNavigationUrl('editorPublish'),
    },
  ];
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
      link: RoutePaths.Deploy, //packagesRouter.getPackageNavigationUrl('editorPublish'), // fix
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

  // TODO - Is this filter needed??
  const menuItems = getFilteredTopBarMenu(repoType);

  const { selectedFormLayoutSetName } = useSelectedFormLayoutSetName();
  const { selectedFormLayoutName } = useSelectedFormLayoutName(selectedFormLayoutSetName);

  return (
    <>
      <AltinnHeader
        menuItems={!isRepoError && menuItems}
        showSubMenu={showSubMenu || !isRepoError}
        subMenuContent={<SubMenuContent hasRepoError={isRepoError} />}
        org={org}
        app={!isRepoError && app}
        user={user}
        repository={repository}
        repoOwnerIsOrg={repoOwnerIsOrg}
        buttonActions={!isRepoError && buttonActionsOld(org, app, selectedFormLayoutName)}
      />
      <div style={{ border: '4px solid black', marginBlock: '10px' }} />
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
          <StudioPageHeader.Right>Right</StudioPageHeader.Right>
        </StudioPageHeader.Main>
        {(showSubMenu || !isRepoError) && (
          <StudioPageHeader.Sub>
            <SubMenuContent hasRepoError={isRepoError} />
          </StudioPageHeader.Sub>
        )}
      </StudioPageHeader>
    </>
  );
};
