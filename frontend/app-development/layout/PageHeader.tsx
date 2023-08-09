import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { routes } from '../config/routes';
import { AltinnHeader } from 'app-shared/components/altinnHeader/AltinnHeader';
import { getTopBarMenu } from './AppBar/appBarConfig';
import { getRepositoryType } from 'app-shared/utils/repository';
import { ThreeDotsMenu } from 'app-development/layout/AppBar/ThreeDotsMenu';
import { VersionControlHeader } from 'app-development/layout/version-control/VersionControlHeader';
import classes from './PageHeader.module.css';
import { useUserQuery } from 'app-development/hooks/queries';
import { useAppSelector } from 'app-development/hooks';
import { previewPath, publishPath } from 'app-shared/api/paths';
import { TopBarMenu } from './AppBar/appBarConfig';
import { ButtonVariant } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';
import { AltinnButtonActionItem } from 'app-shared/components/altinnHeader/types';
import { GiteaHeader } from 'app-shared/components/GiteaHeader';

interface SubMenuContentProps {
  org: string;
  app: string;
}

export const subMenuContent = ({ org, app }: SubMenuContentProps) => {
  return (
    /*<div>
      <div className={classes.rightContent}>
        {<VersionControlHeader data-testid='version-control-header' />}
        {<ThreeDotsMenu data-testid='three-dots-menu' />}
      </div>
    </div>*/
    <GiteaHeader org={org} app={app} hasCloneModal />
  );
};

export const buttonActions = (org: string, app: string): AltinnButtonActionItem[] => {
  const actions = [
    {
      title: 'top_menu.preview',
      path: previewPath,
      menuKey: TopBarMenu.Preview,
      buttonVariant: ButtonVariant.Outline,
      headerButtonsClasses: classes.previewButton,
      handleClick: () => (window.location.href = previewPath(org, app)),
      inBeta: true,
    },
    {
      title: 'top_menu.deploy',
      path: publishPath,
      menuKey: TopBarMenu.Deploy,
      buttonVariant: ButtonVariant.Outline,
      headerButtonsClasses: undefined,
      handleClick: () => (window.location.href = publishPath(org, app)),
    },
  ];
  return actions;
};

interface PageHeaderProps {
  showSubMenu: boolean;
  org: string;
  app: string;
}

export const PageHeader = ({ showSubMenu, org, app }: PageHeaderProps) => {
  const repoType = getRepositoryType(org, app);
  const { t } = useTranslation();
  const { data: user } = useUserQuery();
  const repository = useAppSelector((state) => state.serviceInformation.repositoryInfo);
  const menu = getTopBarMenu(org, app, repoType, t);
  return (
    <Routes>
      {routes.map((route) => (
        <Route
          key={route.path}
          path={route.path}
          element={
            <AltinnHeader
              menu={menu}
              showSubMenu={showSubMenu}
              subMenuContent={subMenuContent({ org, app })}
              activeMenuSelection={route.activeSubHeaderSelection}
              org={org}
              app={app}
              user={user}
              repository={{ ...repository }}
              buttonActions={buttonActions(org, app)}
            />
          }
        />
      ))}
    </Routes>
  );
};
