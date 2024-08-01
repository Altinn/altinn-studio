import React, { useEffect } from 'react';
import postMessages from 'app-shared/utils/postMessages';
import { Outlet, matchPath, useLocation } from 'react-router-dom';
import classes from './App.module.css';
import { useRepoStatusQuery } from 'app-shared/hooks/queries';
import { appContentWrapperId } from '@studio/testing/testids';

export function App() {
  const { pathname } = useLocation();
  const match = matchPath({ path: '/:org/:app', caseSensitive: true, end: false }, pathname);
  const org = match?.params?.org ?? '';
  const app = match?.params?.app ?? '';

  const { refetch: reFetchRepoStatus } = useRepoStatusQuery(org, app);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  useEffect(() => {
    const windowEventReceived = async (event: any) => {
      if (event.data === postMessages.forceRepoStatusCheck) {
        await reFetchRepoStatus();
      }
    };

    window.addEventListener('message', windowEventReceived);
    return function cleanup() {
      window.removeEventListener('message', windowEventReceived);
    };
  }, [reFetchRepoStatus]);

  return (
    <div className={classes.container}>
      <div data-testid={appContentWrapperId}>
        <Outlet />
      </div>
    </div>
  );
}
