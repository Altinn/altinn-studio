import React from 'react';
import { Route } from 'react-router-dom';
import { LandingPage } from '../pages/LandingPage';
import { PageLayout } from '../layout/PageLayout';

export const routes = (
  <Route element={<PageLayout />}>
    <Route path='/:org/:app' element={<LandingPage />} />
  </Route>
);
