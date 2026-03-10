import React from 'react';
import { Route } from 'react-router-dom';
import { PageLayout } from '../layout/PageLayout';
import { LandingPage } from '../pages/LandingPage';

export const routes = (
  <Route element={<PageLayout />}>
    <Route path='/:org/:app' element={<LandingPage />} />
    <Route path='/:org/:app/:layoutSet' element={<LandingPage />} />
  </Route>
);
