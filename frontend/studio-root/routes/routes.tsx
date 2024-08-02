import React from 'react';
import { Route } from 'react-router-dom';
import { PageLayout } from '../pages/PageLayout';
import { Contact } from '../pages/Contact/Contact';

export const routes = (
  <Route element={<PageLayout />}>
    <Route path='/contact' element={<Contact />} />
  </Route>
);
