import { useEffect } from 'react';
import './PageLayout.css';
import { Outlet, useLocation } from 'react-router-dom';
import classes from './PageLayout.module.css';
import { appContentWrapperId } from '@studio/testing/testids';
import { WebSocketSyncWrapper } from './WebSocketSyncWrapper';
import { PageHeader } from './PageHeader';

export const PageLayout = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className={classes.container}>
      <div data-testid={appContentWrapperId} className={classes.appContainer}>
        <WebSocketSyncWrapper>
          <PageHeader />
          <Outlet />
        </WebSocketSyncWrapper>
      </div>
    </div>
  );
};
