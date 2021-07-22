import { Grid, Hidden, StyledComponentProps } from '@material-ui/core';
import LeftDrawerMenu from 'app-shared/navigation/drawer/LeftDrawerMenu';
import classNames from 'classnames';
import React = require('react');
import { Redirect, Route, Switch } from 'react-router-dom';
import { IShareChangesComponentProps } from 'app-shared/version-control/shareChanges';
import routes from '../config/routes';
import appDevelopmentLeftDrawerSettings from '../config/subPathSettings';
import HandleMergeConflict from '../features/handleMergeConflict/HandleMergeConflictContainer';

interface ILeftMenuProps extends StyledComponentProps {
  repoStatus: IShareChangesComponentProps,
  language: any;
}

const LeftMenu = (componentProps: ILeftMenuProps) => {
  const {
    repoStatus, classes, language,
  } = componentProps;
  return (
    <Grid item xs={12}>
      {
        !repoStatus.hasMergeConflict ?
          <>
            <Hidden smDown>
              <div style={{ top: 50 }}>
                {routes.map((route) => (
                  <Route
                    key={route.path}
                    path={route.path}
                    exact={route.exact}
                    render={(props) => <LeftDrawerMenu
                      // eslint-disable-next-line react/jsx-props-no-spreading
                      {...props}
                      menuType={route.menu}
                      activeLeftMenuSelection={route.activeLeftMenuSelection}
                      leftMenuItems={appDevelopmentLeftDrawerSettings}
                    />
                    }
                  />
                ))}
              </div>
            </Hidden>
            <div className={classes.subApp}>
              {routes.map((route) => (
                <Route
                  key={route.path}
                  path={route.path}
                  exact={route.exact}
                  render={(props) => <route.subapp
                    // eslint-disable-next-line react/jsx-props-no-spreading
                    {...props}
                    // eslint-disable-next-line react/jsx-props-no-spreading
                    {...route.props}
                    language={language}
                  />}
                />
              ))}
            </div>
          </>
          :
          <div
            className={classNames({
              [classes.mergeConflictApp]: repoStatus.hasMergeConflict,
              [classes.subApp]: !repoStatus.hasMergeConflict,
            })}
          >
            <Switch>
              <Route
                path='/mergeconflict'
                exact={true}
                component={HandleMergeConflict}
              />
              <Redirect to='/mergeconflict' />
            </Switch>
          </div>
      }
    </Grid>
  );
};

export default LeftMenu;
