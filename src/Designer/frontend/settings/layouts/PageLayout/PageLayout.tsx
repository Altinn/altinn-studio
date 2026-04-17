import classes from './PageLayout.module.css';
import { Outlet } from 'react-router-dom';
import './PageLayout.css';
import { PageHeader } from './PageHeader';

export const PageLayout = () => {
  return (
    <div className={classes.container}>
      <div data-color-scheme='dark'>
        <PageHeader />
      </div>
      <div className={classes.content}>
        <Outlet />
      </div>
    </div>
  );
};
