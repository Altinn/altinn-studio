import { useEffect } from 'react';
import './PageLayout.css';
import { Outlet, useLocation, useMatch, useNavigate } from 'react-router-dom';
import classes from './PageLayout.module.css';
import { appContentWrapperId } from '@studio/testing/testids';
import { WebSocketSyncWrapper } from './WebSocketSyncWrapper';
import { PageHeader } from 'app-shared/components/PageHeader/PageHeader';
import { useRoutePathsParams } from 'admin/hooks/useRoutePathsParams';
import { RoutePaths } from 'admin/routes/RoutePaths';

export const PageLayout = () => {
  const { owner } = useRoutePathsParams();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const ownerMatch = useMatch(`/${RoutePaths.Owner}/*`);
  const subPath = ownerMatch?.params['*'] || '';

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  const buildPath = (username: string) => (subPath ? `/${username}/${subPath}` : `/${username}`);

  return (
    <div className={classes.container}>
      <div data-testid={appContentWrapperId} className={classes.appContainer}>
        <WebSocketSyncWrapper>
          <PageHeader
            owner={owner}
            onOrgSelect={(org) => navigate(buildPath(org.username))}
            onUserSelect={(user) => navigate(buildPath(user.login))}
          />
          <Outlet />
        </WebSocketSyncWrapper>
      </div>
    </div>
  );
};
