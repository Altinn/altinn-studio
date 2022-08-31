// TODO: this does not really need to be a router and have the AppBar fully re-render on navigation.
// TODO: Move the re-directs out from this component. They do not make sense here.
import {Grid} from '@material-ui/core';
import {AppBar} from './AppBar';
import React from 'react';
import {Route, Routes} from 'react-router-dom';
import routes from '../config/routes';
import appDevelopmentLeftDrawerSettings from '../config/subPathSettings';
import type {IAltinnWindow} from '../types/global';

interface IPageHeaderProps {
  repoStatus: any;
}

const PageHeader = (ownProps: IPageHeaderProps) => {
  const {repoStatus} = ownProps;
  const {app, org} = window as Window as IAltinnWindow;
  return (
    <Routes>
      {routes.map((route) => (
        <Route key={route.path} path={route.path} element={
          <Grid item xs={12}>
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
          </Grid>
        }/>
      ))}
    </Routes>
  );
};

export default PageHeader;
