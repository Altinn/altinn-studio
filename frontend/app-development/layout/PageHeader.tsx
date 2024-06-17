import React from 'react';
import { AltinnHeader } from 'app-shared/components/altinnHeader/AltinnHeader';
import { getFilteredTopBarMenu } from './AppBar/appBarConfig';
import { getRepositoryType } from 'app-shared/utils/repository';
import { useAppSelector } from 'app-development/hooks';
import type { AltinnButtonActionItem } from 'app-shared/components/altinnHeader/types';
import { GiteaHeader } from 'app-shared/components/GiteaHeader';
import { SettingsModalButton } from './SettingsModalButton';
import { TopBarMenu } from 'app-shared/enums/TopBarMenu';
import type { User } from 'app-shared/types/Repository';
import { PackagesRouter } from 'app-shared/navigation/PackagesRouter';
import { RepositoryType } from 'app-shared/types/global';
import { useSelectedFormLayoutSetName, useSelectedFormLayoutName } from '@altinn/ux-editor/hooks';
import { usePreviewContext } from 'app-development/contexts/PreviewContext';

type SubMenuContentProps = {
  org: string;
  app: string;
  hasRepoError?: boolean;
};

export const subMenuContent = ({ org, app, hasRepoError }: SubMenuContentProps) => {
  const repositoryType = getRepositoryType(org, app);
  const { doReloadPreview } = usePreviewContext();

  return (
    <GiteaHeader
      org={org}
      app={app}
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
  org: string;
  app: string;
  showSubMenu: boolean;
  user: User;
  repoOwnerIsOrg: boolean;
  isRepoError?: boolean;
};

export const PageHeader = ({
  org,
  app,
  showSubMenu,
  user,
  repoOwnerIsOrg,
  isRepoError,
}: PageHeaderProps) => {
  const repoType = getRepositoryType(org, app);
  const repository = useAppSelector((state) => state.serviceInformation.repositoryInfo);
  const menuItems = getFilteredTopBarMenu(repoType);
  const { selectedFormLayoutSetName } = useSelectedFormLayoutSetName();
  const { selectedFormLayoutName } = useSelectedFormLayoutName(selectedFormLayoutSetName);

  return (
    <AltinnHeader
      menuItems={!isRepoError && menuItems}
      showSubMenu={showSubMenu || !isRepoError}
      subMenuContent={subMenuContent({ org, app, hasRepoError: isRepoError })}
      org={org}
      app={!isRepoError && app}
      user={user}
      repository={repository}
      repoOwnerIsOrg={repoOwnerIsOrg}
      buttonActions={!isRepoError && buttonActions(org, app, selectedFormLayoutName)}
    />
  );
};
