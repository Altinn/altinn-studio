import { useEffect } from 'react';
import './App.css';
import { Outlet, useLocation } from 'react-router-dom';
import classes from './App.module.css';
import { appContentWrapperId } from '@studio/testing/testids';
import { WebSocketSyncWrapper } from './WebSocketSyncWrapper';

export function App() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className={classes.container}>
      <div data-testid={appContentWrapperId} className={classes.appContainer}>
        <WebSocketSyncWrapper>
          <Outlet />
        </WebSocketSyncWrapper>
      </div>
    </div>
  );
}
