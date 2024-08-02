import React from 'react';
import { Outlet } from 'react-router-dom';
import classes from './PageLayout.module.css';

// TODO : https://github.com/Altinn/altinn-studio/issues/13271
export const PageLayout = (): React.ReactNode => {
  return (
    <div className={classes.container}>
      <Outlet />
    </div>
  );
};
