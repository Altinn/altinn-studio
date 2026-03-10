import type { ReactNode } from 'react';
import React, { useMemo } from 'react';
import {
  RouterProvider,
  createBrowserRouter,
  createRoutesFromElements,
  Route,
} from 'react-router-dom';
import { StudioNotFoundPage } from '@studio/components/src/components/StudioNotFoundPage';
import { useTranslation } from 'react-i18next';

const NotFoundPage = () => {
  const { t } = useTranslation();
  return (
    <StudioNotFoundPage
      title={t('not_found_page.heading')}
      body={t('not_found_page.sub_heading')}
      redirectHref='/'
      redirectLinkText={t('not_found_page.go_to_front_page')}
    />
  );
};

type RoutesProps = {
  basename: string;
  routes: ReactNode;
};

export const Routes = ({ basename, routes }: RoutesProps) => {
  const router = useMemo(
    () =>
      createBrowserRouter(
        createRoutesFromElements(
          <Route path='/'>
            {routes}
            <Route path='*' element={<NotFoundPage />} />
          </Route>,
        ),
        { basename },
      ),
    [basename, routes],
  );

  return <RouterProvider router={router} />;
};
