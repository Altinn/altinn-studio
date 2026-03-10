import React from 'react';
import { Outlet } from 'react-router-dom';
import classes from './App.module.css';
import { appContentWrapperId } from '@studio/testing/testids';

export function App() {
  return (
    <div className={classes.container}>
      <div data-testid={appContentWrapperId} className={classes.appContainer}>
        <Outlet />
      </div>
    </div>
  );
}
