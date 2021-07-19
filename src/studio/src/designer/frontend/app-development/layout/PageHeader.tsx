import { Grid } from '@material-ui/core';
import AppBarComponent from 'app-shared/navigation/main-header/appBar';
import React = require('react');
import { Redirect, Route } from 'react-router-dom';
import routes from '../config/routes';
import appDevelopmentLeftDrawerSettings from '../config/subPathSettings';
import { redirects } from '../config/redirects';

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
          <Route
            key={route.to}
            exact={true}
            path={route.from}
            render={() => (
              <Redirect to={route.to} />
            )}
          />
        ))
      }
      {routes.map((route) => (
        <Route
          key={route.path}
          path={route.path}
          exact={route.exact}
          render={(props) => <AppBarComponent
            // eslint-disable-next-line react/jsx-props-no-spreading
            {...props}
            activeLeftMenuSelection={route.activeLeftMenuSelection}
            activeSubHeaderSelection={route.activeSubHeaderSelection}
            logoutButton={repoStatus.hasMergeConflict}
            org={org}
            app={app}
            showBreadcrumbOnTablet={true}
            showSubMenu={!repoStatus.hasMergeConflict}
            mainMenuItems={[{
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
            }]}
            subMenuItems={appDevelopmentLeftDrawerSettings}
          />}
        />
      ))}
    </Grid>
  );
};

export default PageHeader;
