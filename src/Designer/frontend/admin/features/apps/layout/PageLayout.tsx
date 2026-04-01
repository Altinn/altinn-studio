import classes from './PageLayout.module.css';
import { Outlet } from 'react-router-dom';

export const PageLayout = () => {
  return (
    <div className={classes.pageWrapper}>
      <Outlet />
    </div>
  );
};
