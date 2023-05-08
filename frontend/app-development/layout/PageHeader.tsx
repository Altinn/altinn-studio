import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { routes } from '../config/routes';
import { AltinnHeader } from 'app-shared/components/altinnHeader/AltinnHeader';

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
          element={<AltinnHeader showSubMenu={showSubMenu} />}
        />
      ))}
    </Routes>
  );
};
