import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { LandingPage } from './views/LandingPage';
import { NoMatch } from './views/NoMatch';
import classes from './PreviewApp.module.css';

export const PreviewApp = () => {
  return (
    <div className={classes.previewContainer}>
      <Routes>
        <Route path='/preview/:org/:app' element={<LandingPage />} />
        <Route path='*' element={<NoMatch />} />
      </Routes>
    </div>
  );
};
