import React from 'react';
import { AltinnHeader } from 'app-shared/components/altinnHeader/AltinnHeader';
import { getTopBarMenu } from './AppBar/appBarConfig';
import { getRepositoryType } from 'app-shared/utils/repository';
import { useUserQuery } from 'app-development/hooks/queries';
import { useAppSelector } from 'app-development/hooks';
import { previewPath, publishPath } from 'app-shared/api/paths';
import { TopBarMenu } from './AppBar/appBarConfig';
import { useTranslation } from 'react-i18next';
import { AltinnButtonActionItem } from 'app-shared/components/altinnHeader/types';
import { GiteaHeader } from 'app-shared/components/GiteaHeader';
import { SettingsModalButton } from './SettingsModalButton';
import { RoutePaths } from 'app-development/enums/RoutePaths';

type SubMenuContentProps = {
  org: string;
  app: string;
};

export const subMenuContent = ({ org, app }: SubMenuContentProps) => {
  return (
    <GiteaHeader
      org={org}
      app={app}
      hasCloneModal
      leftComponent={<SettingsModalButton org={org} app={app} />}
    />
  );
};

export const buttonActions = (org: string, app: string): AltinnButtonActionItem[] => {
  const actions: AltinnButtonActionItem[] = [
    {
      title: 'top_menu.preview',
      path: previewPath,
      menuKey: TopBarMenu.Preview,
      buttonVariant: 'secondary',
      buttonColor: 'inverted',
      headerButtonsClasses: undefined,
      handleClick: () => (window.location.href = previewPath(org, app)),
    },
    {
      title: 'top_menu.deploy',
      path: publishPath,
      menuKey: TopBarMenu.Deploy,
      buttonVariant: 'secondary',
      headerButtonsClasses: undefined,
      handleClick: () => (window.location.href = publishPath(org, app)),
    },
  ];
  return actions;
};

type PageHeaderProps = {
  org: string;
  app: string;
  activeRoute: RoutePaths;
};

export const PageHeader = ({ org, app, activeRoute }: PageHeaderProps) => {
  const repoType = getRepositoryType(org, app);
  const { t } = useTranslation();
  const { data: user } = useUserQuery();
  const repository = useAppSelector((state) => {
    // This gives null when invalid url
    console.log('state in pageHeader', state.serviceInformation.repositoryInfo);
    return state.serviceInformation.repositoryInfo;
  });
  const menu = getTopBarMenu(repoType, t);

  console.log('repository in pageHeader', repository);
  // TODO - Handle empty repository / repo error
  // When editing URL, repo gets issues
  return (
    user && (
      <AltinnHeader
        menu={menu}
        // TODO - SET TO FALSE IF THERE IS A MERGE CONFLICT?
        // TODO - Hide on error page
        showSubMenu={true} //route.activeSubHeaderSelection !== TopBarMenu.None}
        subMenuContent={subMenuContent({ org, app })}
        activeMenuSelection={activeRoute}
        org={org}
        app={app}
        user={user}
        repository={repository} //{ ...repository }}
        buttonActions={buttonActions(org, app)}
      />
    )
  );
};
