import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { routes } from '../config/routes';
import { AltinnHeader } from 'app-shared/components/altinnHeader/AltinnHeader';
import { getTopBarMenu } from './AppBar/appBarConfig';
import { getRepositoryType } from 'app-shared/utils/repository';
import { BranchingIcon } from '@navikt/aksel-icons';
import { ThreeDotsMenu } from 'app-development/layout/AppBar/ThreeDotsMenu';
import { VersionControlHeader } from 'app-development/layout/version-control/VersionControlHeader';
import classes from './PageHeader.module.css';
import { useUserQuery } from 'app-development/hooks/queries';
import { useAppSelector } from 'app-development/hooks';
import { previewPath, publiserPath } from 'app-shared/api/paths';
import { TopBarMenu } from './AppBar/appBarConfig';
import { ButtonVariant } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';
import { AltinnButtonActionItem } from 'app-shared/components/altinnHeader/types';

interface PageHeaderProps {
  showSubMenu: boolean;
  org: string;
  app: string;
}

const subMenuContent = () => {
  return (
    <>
      <div className={classes.leftContent} data-testid='branching-icon'>
        {<BranchingIcon className={classes.branchIcon} />}
      </div>
      <div className={classes.rightContent}>
        {<VersionControlHeader data-testid='version-control-header' />}
        {<ThreeDotsMenu data-testid='three-dots-menu' />}
      </div>
    </>
  );
};

const buttonActions = (org: string, app: string): AltinnButtonActionItem[] => {
  const actions = [
    {
      title: 'top_menu.preview',
      path: previewPath,
      menuKey: TopBarMenu.Preview,
      buttonVariant: ButtonVariant.Outline,
      headerButtonsClasses: classes.previewButton,
      handleClick: () => window.open(previewPath(org, app), '_blank'),
      inBeta: true,
    },
    {
      title: 'top_menu.deploy',
      path: publiserPath,
      menuKey: TopBarMenu.Deploy,
      buttonVariant: ButtonVariant.Outline,
      headerButtonsClasses: undefined,
      handleClick: () => (window.location.href = publiserPath(org, app)),
    },
  ];
  return actions;
};

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
              subMenuContent={subMenuContent()}
              activeMenuSelection={route.activeSubHeaderSelection}
              org={org}
              app={app}
              user={user}
              repository={{ ...repository, user_has_starred: false }}
              buttonActions={buttonActions(org, app)}
            />
          }
        />
      ))}
    </Routes>
  );
};
