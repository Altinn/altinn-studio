import React from 'react';
import { Route } from 'react-router-dom';
import { PageLayout } from '../pages/PageLayout';
import { ResourcePage } from '../pages/ResourcePage';
import { ResourceDashboardPage } from '../pages/ResourceDashboardPage';
import { ErrorPage } from '../pages/ErrorPage';
import { RedirectPage } from '../pages/RedirectPage';
import { ListAdminPage } from '../pages/ListAdminPage';
import { AccessListPage } from '../pages/AccessListPage';

// PageLayout banner uses organization, named as org
const basePath = '/:org/:app';

export const routes = (
  <Route element={<PageLayout />}>
    <Route path={basePath} element={<ResourceDashboardPage />} />
    <Route path={`${basePath}/accesslists/:env?`} element={<ListAdminPage />} />
    <Route path={`${basePath}/accesslists/:env/:accessListId`} element={<AccessListPage />} />
    <Route
      path={`${basePath}/resource/:resourceId/:pageType/:env?/:accessListId?`}
      element={<ResourcePage />}
    />
    <Route path='/' element={<ErrorPage />} />
    <Route path='/:org' element={<RedirectPage />} />
  </Route>
);
