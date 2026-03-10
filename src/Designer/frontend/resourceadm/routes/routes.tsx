import React from 'react';
import { Route } from 'react-router-dom';
import { App } from '../app/App';
import { PageLayout } from '../pages/PageLayout';
import { ResourcePage } from '../pages/ResourcePage';
import { ResourceDashboardPage } from '../pages/ResourceDashboardPage';
import { ErrorPage } from '../pages/ErrorPage';
import { RedirectPage } from '../pages/RedirectPage';
import { ListAdminPage } from '../pages/ListAdminPage';
import { AccessListPage } from '../pages/AccessListPage';

const BASE_PATH = '/:org/:app';

export const routes = (
  <Route element={<App />}>
    <Route element={<PageLayout />}>
      <Route path={BASE_PATH} element={<ResourceDashboardPage />} />
      <Route path={`${BASE_PATH}/accesslists/:env?`} element={<ListAdminPage />} />
      <Route path={`${BASE_PATH}/accesslists/:env/:accessListId`} element={<AccessListPage />} />
      <Route
        path={`${BASE_PATH}/resource/:resourceId/:pageType/:env?/:accessListId?`}
        element={<ResourcePage />}
      />
      <Route path='/:org' element={<RedirectPage />} />
    </Route>
    <Route index element={<ErrorPage />} />
  </Route>
);
