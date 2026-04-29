import { Navigate } from 'react-router-dom';
import { useUserQuery } from 'app-shared/hooks/queries';
import { RoutePaths as UserRoutePaths } from '../../features/user/routes/RoutePaths';
import { RoutePaths as OrgRoutePaths } from '../../features/orgs/routes/RoutePaths';
import { useRequiredRoutePathsParams } from 'settings/hooks/useRequiredRoutePathsParams';
import { useEnvironmentConfig } from 'app-shared/contexts/EnvironmentConfigContext';
import { NoOrgSelected } from '../NoOrgSelected/NoOrgSelected';
import { NotFound } from '../NotFound/NotFound';
import { FeatureFlag, useFeatureFlag } from '@studio/feature-flags';

export const OwnerIndexRedirect = () => {
  const { owner } = useRequiredRoutePathsParams(['owner']);
  const { data: user } = useUserQuery();
  const { environment } = useEnvironmentConfig();
  const studioOidc = environment?.featureFlags?.studioOidc;
  const isAdminEnabled = useFeatureFlag(FeatureFlag.Admin);
  if (!user) return null;
  if (!studioOidc && !isAdminEnabled) {
    return <NotFound />;
  }
  if (owner === user.login) {
    return studioOidc ? <Navigate to={UserRoutePaths.ApiKeys} replace /> : <NoOrgSelected />;
  }
  return (
    <Navigate to={studioOidc ? OrgRoutePaths.BotAccounts : OrgRoutePaths.ContactPoints} replace />
  );
};
