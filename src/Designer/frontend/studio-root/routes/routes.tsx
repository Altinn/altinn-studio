import React from 'react';
import { Route } from 'react-router-dom';
import { PageLayout } from '../layout';
import { ContactPage } from '../pages/Contact/ContactPage';
import { FlagsPage } from 'studio-root/pages/FlagsPage/FlagsPage';

export const routes = (
  <Route element={<PageLayout />}>
    <Route path='/contact' element={<ContactPage />} />
    <Route path='/flags' element={<FlagsPage />} />
  </Route>
);
