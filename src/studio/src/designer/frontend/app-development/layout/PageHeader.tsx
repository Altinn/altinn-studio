import { Grid } from '@material-ui/core';
import { AppBar } from './AppBar';
import React from 'react';
import { Redirect, Route } from 'react-router-dom';
import routes from '../config/routes';
import appDevelopmentLeftDrawerSettings from '../config/subPathSettings';
import { redirects } from '../config/redirects';
import type { IAltinnWindow } from '../types/global';

interface IPageHeaderProps {
  repoStatus: any;
}

const PageHeader = (ownProps: IPageHeaderProps) => {
  const { repoStatus } = ownProps;
  const { app, org } = window as Window as IAltinnWindow;
  return (
    <Grid item xs={12}>
      {!repoStatus.hasMergeConflict &&
        redirects.map((route) => (
          <Route key={route.to} exact={true} path={route.from}>
            <Redirect to={route.to} />
          </Route>
        ))}
      {routes.map((route) => (
        <Route key={route.path} path={route.path} exact={route.exact}>
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
                navLink: '/about',
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
        </Route>
      ))}
    </Grid>
  );
};

export default PageHeader;
