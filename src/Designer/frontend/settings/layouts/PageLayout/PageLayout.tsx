import classes from './PageLayout.module.css';
import { Outlet, useMatch, useNavigate } from 'react-router-dom';
import './PageLayout.css';
import { PageHeader } from 'app-shared/components/PageHeader/PageHeader';
import { RoutePaths } from '../../routes/RoutePaths';
import { RoutePaths as OrgRoutePaths } from '../../features/orgs/routes/RoutePaths';
import { RoutePaths as UserRoutePaths } from '../../features/user/routes/RoutePaths';

const orgValidPaths = Object.values(OrgRoutePaths);
const userValidPaths = Object.values(UserRoutePaths);

export const PageLayout = () => {
  const navigate = useNavigate();
  const ownerMatch = useMatch(`/${RoutePaths.Owner}/*`);
  const subPath = ownerMatch?.params['*'] || '';
  const owner = ownerMatch?.params.owner;

  const buildPath = (username: string, validPaths: string[]) => {
    const page = validPaths.includes(subPath) ? subPath : '';
    return page ? `/${username}/${page}` : `/${username}`;
  };

  return (
    <div className={classes.container}>
      <div data-color-scheme='dark'>
        <PageHeader
          owner={owner}
          onOrgSelect={(org) => navigate(buildPath(org.username, orgValidPaths))}
          onUserSelect={(user) => navigate(buildPath(user.login, userValidPaths))}
        />
      </div>
      <div className={classes.content}>
        <Outlet />
      </div>
    </div>
  );
};
