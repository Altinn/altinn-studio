import React from 'react';
import { Outlet } from 'react-router-dom';
import classes from './PreviewApp.module.css';

export const PreviewApp = () => {
  return (
    <div className={classes.previewContainer}>
      <Outlet />
    </div>
  );
};
