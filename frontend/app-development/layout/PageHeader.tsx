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

type SubMenuContentProps = {
  org: string;
  app: string;
};

export const subMenuContent = ({ org, app }: SubMenuContentProps) => {
  const repositoryType = getRepositoryType(org, app);
  return (
    <GiteaHeader
      org={org}
      app={app}
      hasCloneModal
      leftComponent={
        repositoryType !== RepositoryType.Datamodels && <SettingsModalButton org={org} app={app} />
      }
    />
  );
};

export const buttonActions = (org: string, app: string): AltinnButtonActionItem[] => {
  const packagesRouter = new PackagesRouter({ org, app });

  const actions: AltinnButtonActionItem[] = [
    {
      title: 'top_menu.preview',
      menuKey: TopBarMenu.Preview,
      to: packagesRouter.getPackageNavigationUrl('preview'),
      isInverted: true,
    },
    {
      title: 'top_menu.deploy',
      menuKey: TopBarMenu.Deploy,
      to: packagesRouter.getPackageNavigationUrl('editorPublish'),
    },
  ];
  return actions;
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

  return (
    <AltinnHeader
      menuItems={!isRepoError && menuItems}
      showSubMenu={showSubMenu && !isRepoError}
      subMenuContent={!isRepoError && subMenuContent({ org, app })}
      org={org}
      app={!isRepoError && app}
      user={user}
      repository={repository}
      repoOwnerIsOrg={repoOwnerIsOrg}
      buttonActions={!isRepoError && buttonActions(org, app)}
    />
  );
};
