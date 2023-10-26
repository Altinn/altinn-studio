import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { routes } from '../config/routes';
import { NotFoundPage } from 'app-development/features/notFound';

interface ILeftMenuProps {
  subAppClassName?: string;
}

export const PageContainer = ({ subAppClassName }: ILeftMenuProps) => {
  return (
    <div className={subAppClassName}>
      <Routes>
        {routes.map((route) => (
          <Route key={route.path} path={route.path} element={<route.subapp {...route.props} />} />
        ))}
        <Route path='/not-found' element={<NotFoundPage />} />
      </Routes>
    </div>
  );
};
