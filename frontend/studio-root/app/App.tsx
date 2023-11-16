import React from 'react';
import classes from './App.module.css';
import { Route, Routes } from 'react-router-dom';
import { NotFoundPage } from 'app-shared/components/notFound';

import './App.css';
import { PageLayout } from '../pages/PageLayout';
import { Contact } from '../pages/Contact/Contact';

export const App = (): JSX.Element => {
  return (
    <div className={classes.root}>
      <Routes>
        <Route element={<PageLayout />}>
          <Route path='/contact' element={<Contact />} />
          <Route path='*' element={<NotFoundPage />} />
        </Route>
      </Routes>
    </div>
  );
};
