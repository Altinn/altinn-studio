import classes from './PageLayout.module.css';
import { Outlet } from 'react-router-dom';
import './PageLayout.css';
import { PageHeader } from 'app-shared/components/PageHeader/PageHeader';
import { RoutePaths as OrgRoutePaths } from '../../features/orgs/routes/RoutePaths';
import { RoutePaths as UserRoutePaths } from '../../features/user/routes/RoutePaths';
import { useRoutePathsParams } from 'settings/hooks/useRoutePathsParams';

export const PageLayout = () => {
  const { owner } = useRoutePathsParams();
  return (
    <div className={classes.container}>
      <div data-color-scheme='dark'>
        <PageHeader
          owner={owner}
          orgRoutePaths={Object.values(OrgRoutePaths)}
          userRoutePaths={Object.values(UserRoutePaths)}
        />
      </div>
      <div className={classes.content}>
        <Outlet />
      </div>
    </div>
  );
};
