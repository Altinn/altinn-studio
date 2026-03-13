import React from 'react';
import classes from './PageLayout.module.css';
import { Outlet } from 'react-router-dom';
import './PageLayout.css';
import { Menu } from '../../components/Menu/Menu';

export const PageLayout = () => {
  return (
    <div className={classes.pageContentWrapper}>
      <div className={classes.leftNavWrapper}>
        <Menu />
      </div>
      <div className={classes.contentWrapper}>
        <Outlet />
      </div>
    </div>
  );
};
