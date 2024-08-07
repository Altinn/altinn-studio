import React from 'react';
import { AltinnHeader } from 'app-shared/components/altinnHeader/AltinnHeader';
import { getFilteredTopBarMenu } from './AppBar/appBarConfig';
import { getRepositoryType } from 'app-shared/utils/repository';
import type { AltinnButtonActionItem } from 'app-shared/components/altinnHeader/types';
import { GiteaHeader } from 'app-shared/components/GiteaHeader';
import { SettingsModalButton } from './SettingsModalButton';
import { TopBarMenu } from 'app-shared/enums/TopBarMenu';
import type { User } from 'app-shared/types/Repository';
import { PackagesRouter } from 'app-shared/navigation/PackagesRouter';
import { RepositoryType } from 'app-shared/types/global';
import { useSelectedFormLayoutSetName, useSelectedFormLayoutName } from '@altinn/ux-editor/hooks';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { usePreviewContext } from 'app-development/contexts/PreviewContext';
import { useRepoMetadataQuery } from 'app-shared/hooks/queries';

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

export const buttonActions = (
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
    <AltinnHeader
      menuItems={!isRepoError && menuItems}
      showSubMenu={showSubMenu || !isRepoError}
      subMenuContent={<SubMenuContent hasRepoError={isRepoError} />}
      org={org}
      app={!isRepoError && app}
      user={user}
      repository={repository}
      repoOwnerIsOrg={repoOwnerIsOrg}
      buttonActions={!isRepoError && buttonActions(org, app, selectedFormLayoutName)}
    />
  );
};
