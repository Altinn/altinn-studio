import React from 'react';
import { AppBar } from './AppBar';
import { Route, Routes } from 'react-router-dom';
import routes from '../config/routes';
import appDevelopmentLeftDrawerSettings from '../config/subPathSettings';
import type { IAltinnWindow } from '../types/global';

interface IPageHeaderProps {
  repoStatus: any;
}

const PageHeader = (ownProps: IPageHeaderProps) => {
  const { repoStatus } = ownProps;
  const { app, org } = window as Window as IAltinnWindow;
  return (
    <Routes>
      {routes.map((route) => (
        <Route
          key={route.path}
          path={route.path}
          element={
            <AppBar
              activeLeftMenuSelection={route.activeLeftMenuSelection}
              activeSubHeaderSelection={route.activeSubHeaderSelection}
              logoutButton={repoStatus.hasMergeConflict}
              org={org}
              app={app}
              showSubMenu={!repoStatus.hasMergeConflict}
              mainMenuItems={[
                {
                  displayText: 'Om',
                  navLink: '/',
                  menuType: 'about',
                  activeSubHeaderSelection: 'Om',
                },
                {
                  displayText: 'Lage',
                  navLink: '/ui-editor',
                  menuType: 'create',
                  activeSubHeaderSelection: 'Lage',
                },
              ]}
              subMenuItems={appDevelopmentLeftDrawerSettings}
            />
          }
        />
      ))}
    </Routes>
  );
};

export default PageHeader;
