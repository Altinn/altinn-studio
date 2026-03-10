import React from 'react';
import { Route } from 'react-router-dom';
import { PreviewApp } from '../src/PreviewApp';
import { LandingPage } from '../src/views/LandingPage';
import { NoMatch } from '../src/views/NoMatch';

export const routes = (
  <Route element={<PreviewApp />}>
    <Route path='/:org/:app' element={<LandingPage />} />
    <Route path='/:org/:app/:layoutSet' element={<LandingPage />} />
    <Route path='*' element={<NoMatch />} />
  </Route>
);
