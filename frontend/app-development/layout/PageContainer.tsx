import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { routes } from '../config/routes';

interface ILeftMenuProps {
  subAppClassName?: string;
}

export const PageContainer = ({ subAppClassName }: ILeftMenuProps) => (
  <div className={subAppClassName}>
    <Routes>
      {routes.map((route) => (
        <Route key={route.path} path={route.path} element={<route.subapp {...route.props} />} />
      ))}
    </Routes>
  </div>
);

/*
export const PageContainer = ({ subAppClassName }: ILeftMenuProps) => (
  <div className={subAppClassName}>
    <Routes>
      {routes.map((route) => (
        <Route key={route.path} path={route.path} element={<route.subapp {...route.props} />}>
          {route.childRoutes?.length > 0 &&
            routes.map((childRoute) => (
              <Route
                key={childRoute.path}
                path={childRoute.path}
                element={<childRoute.subapp {...childRoute.props} />}
              />
            ))}
        </Route>
      ))}
    </Routes>
  </div>
);
*/
