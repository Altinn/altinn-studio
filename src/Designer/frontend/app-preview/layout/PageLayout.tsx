import React from 'react';
import { Outlet } from 'react-router-dom';
import classes from './PageLayout.module.css';

export const PageLayout = () => {
  return (
    <div className={classes.previewContainer}>
      <Outlet />
    </div>
  );
};
