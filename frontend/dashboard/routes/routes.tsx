import React from 'react';
import { Route } from 'react-router-dom';
import { PageLayout } from '../pages/PageLayout';
import { Dashboard } from '../pages/Dashboard';
import { CreateService } from '../pages/CreateService';

export const routes = (
  <Route path='/' element={<PageLayout />}>
    <Route path='/:selectedContext?' element={<Dashboard />} />
    <Route path='/:selectedContext/new' element={<CreateService />} />
  </Route>
);
