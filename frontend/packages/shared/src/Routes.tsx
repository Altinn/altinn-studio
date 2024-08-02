import type { ReactNode } from 'react';
import React from 'react';
import {
  RouterProvider,
  createBrowserRouter,
  createRoutesFromElements,
  Route,
} from 'react-router-dom';
import { StudioNotFoundPage } from '@studio/components/src/components/StudioNotFoundPage';
import { PageLayout } from './PageLayout';

const router = (basename: string, routes: ReactNode) =>
  createBrowserRouter(
    createRoutesFromElements(
      <Route path='/' element={<PageLayout />}>
        {routes}
        <Route
          path='*'
          element={
            <StudioNotFoundPage
              title={"t('not_found_page.heading')"}
              body={'body'}
              redirectHref='/'
              redirectLinkText={'link'}
            />
          }
        />
      </Route>,
    ),
    {
      basename,
    },
  );

type RoutesProps = {
  basename: string;
  routes: ReactNode;
};

export const Routes = ({ basename, routes }: RoutesProps) => (
  <RouterProvider router={router(basename, routes)} />
);
