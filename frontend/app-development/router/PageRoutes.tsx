import React from 'react';
import classes from './PageRoutes.module.css';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from 'app-development/layout/Layout';
import { RoutePaths } from 'app-development/enums/RoutePaths';
import { routes } from 'app-development/config/routes';

const basePath = '/:org/:app';

/**
 * Displays the routes for app development pages
 */
export const PageRoutes = () => {
  return (
    <div className={classes.root}>
      <Routes>
        <Route path={basePath} element={<Layout />}>
          {/* Redirects from /:org/:app to child route /overview */}
          <Route path={RoutePaths.Root} element={<Navigate to={RoutePaths.Overview} />} />
          {routes.map((route) => (
            <Route key={route.path} path={route.path} element={<route.subapp {...route.props} />} />
          ))}
        </Route>
      </Routes>
    </div>
  );
};
