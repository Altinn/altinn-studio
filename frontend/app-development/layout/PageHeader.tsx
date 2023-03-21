import React from 'react';
import { AppBar } from './AppBar';
import { Route, Routes } from 'react-router-dom';
import { routes } from '../config/routes';

interface IPageHeaderProps {
  repoStatus: any;
}

export const PageHeader = (ownProps: IPageHeaderProps) => {
  const { repoStatus } = ownProps;
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
              showSubMenu={!repoStatus.hasMergeConflict}
            />
          }
        />
      ))}
    </Routes>
  );
};
