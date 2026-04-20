import { useEffect } from 'react';
import './PageLayout.css';
import { Outlet, useLocation } from 'react-router-dom';
import classes from './PageLayout.module.css';
import { appContentWrapperId } from '@studio/testing/testids';
import { WebSocketSyncWrapper } from './WebSocketSyncWrapper';
import { PageHeader } from 'app-shared/components/PageHeader/PageHeader';
import { useRoutePathsParams } from 'admin/hooks/useRoutePathsParams';

export const PageLayout = () => {
  const { owner } = useRoutePathsParams();
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className={classes.container}>
      <div data-testid={appContentWrapperId} className={classes.appContainer}>
        <WebSocketSyncWrapper>
          <PageHeader owner={owner} />
          <Outlet />
        </WebSocketSyncWrapper>
      </div>
    </div>
  );
};
