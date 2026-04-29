import { Navigate } from 'react-router-dom';
import { useUserQuery } from 'app-shared/hooks/queries';
import { RoutePaths as UserRoutePaths } from '../../features/user/routes/RoutePaths';
import { RoutePaths as OrgRoutePaths } from '../../features/orgs/routes/RoutePaths';
import { useRequiredRoutePathsParams } from 'settings/hooks/useRequiredRoutePathsParams';

export const OwnerIndexRedirect = () => {
  const { owner } = useRequiredRoutePathsParams(['owner']);
  const { data: user } = useUserQuery();
  if (!user) return null;
  if (owner === user.login) {
    return <Navigate to={UserRoutePaths.ApiKeys} replace />;
  }
  return <Navigate to={OrgRoutePaths.BotAccounts} replace />;
};
