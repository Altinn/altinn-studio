import { Grid, StyledComponentProps } from '@material-ui/core';
import type { Theme } from '@material-ui/core';
import useMediaQuery from '@material-ui/core/useMediaQuery';
import LeftDrawerMenu from 'app-shared/navigation/drawer/LeftDrawerMenu';
import classNames from 'classnames';
import React from 'react';
import { Redirect, Route, Switch } from 'react-router-dom';
import type { IShareChangesComponentProps } from 'app-shared/version-control/shareChanges';
import routes from '../config/routes';
import appDevelopmentLeftDrawerSettings from '../config/subPathSettings';
import HandleMergeConflict from '../features/handleMergeConflict/HandleMergeConflictContainer';

interface ILeftMenuProps extends StyledComponentProps {
  repoStatus: IShareChangesComponentProps;
  language: any;
}

const SideBar = () => {
  const shouldHideLeftMenu = useMediaQuery((theme: Theme) =>
    theme.breakpoints.down('sm'),
  );

  if (shouldHideLeftMenu) {
    return null;
  }

  return (
    <div style={{ top: 50 }}>
      {routes.map((route) => (
        <Route key={route.path} path={route.path} exact={route.exact}>
          <LeftDrawerMenu
            menuType={route.menu}
            activeLeftMenuSelection={route.activeLeftMenuSelection}
            leftMenuItems={appDevelopmentLeftDrawerSettings}
          />
        </Route>
      ))}
    </div>
  );
};

const LeftMenu = ({ repoStatus, classes, language }: ILeftMenuProps) => {
  return (
    <Grid item xs={12}>
      {!repoStatus.hasMergeConflict ? (
        <>
          <SideBar />
          <div className={classes.subApp}>
            {routes.map((route) => {
              return (
                <Route key={route.path} path={route.path} exact={route.exact}>
                  <route.subapp {...route.props} language={language} />
                </Route>
              );
            })}
          </div>
        </>
      ) : (
        <div
          className={classNames({
            [classes.mergeConflictApp]: repoStatus.hasMergeConflict,
            [classes.subApp]: !repoStatus.hasMergeConflict,
          })}
        >
          <Switch>
            <Route path='/mergeconflict' exact={true}>
              <HandleMergeConflict />
            </Route>
            <Redirect to='/mergeconflict' />
          </Switch>
        </div>
      )}
    </Grid>
  );
};

export default LeftMenu;
