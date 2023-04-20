import React from 'react';
import { AppBar } from './AppBar';
import { Route, Routes } from 'react-router-dom';
import { routes } from '../config/routes';

interface PageHeaderProps {
  showSubMenu: boolean;
}

export const PageHeader = ({ showSubMenu }: PageHeaderProps) => {
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
              showSubMenu={showSubMenu}
            />
          }
        />
      ))}
    </Routes>
  );
};
