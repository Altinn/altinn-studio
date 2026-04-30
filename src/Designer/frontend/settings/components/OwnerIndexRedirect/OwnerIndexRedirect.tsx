import { Navigate } from 'react-router-dom';
import { useUserQuery } from 'app-shared/hooks/queries';
import { RoutePaths as UserRoutePaths } from '../../features/user/routes/RoutePaths';
import { RoutePaths as OrgRoutePaths } from '../../features/orgs/routes/RoutePaths';
import { useRequiredRoutePathsParams } from 'settings/hooks/useRequiredRoutePathsParams';
import { useEnvironmentConfig } from 'app-shared/contexts/EnvironmentConfigContext';
import { NoOrgSelected } from '../NoOrgSelected/NoOrgSelected';
import { NotFound } from '../NotFound/NotFound';
import { FeatureFlag, useFeatureFlag } from '@studio/feature-flags';
import { StudioCenter, StudioPageSpinner } from '@studio/components';
import { StudioPageError } from 'app-shared/components';
import { useTranslation } from 'react-i18next';

export const OwnerIndexRedirect = () => {
  const { t } = useTranslation();
  const { owner } = useRequiredRoutePathsParams(['owner']);
  const { data: user, isPending: isUserPending, isError: isUserError } = useUserQuery();
  const { environment, isPending: isEnvironmentPending } = useEnvironmentConfig();
  const studioOidc = environment?.featureFlags?.studioOidc;
  const isAdminEnabled = useFeatureFlag(FeatureFlag.Admin);

  if (isUserPending || isEnvironmentPending) {
    return (
      <StudioCenter>
        <StudioPageSpinner spinnerTitle={t('general.loading')} />
      </StudioCenter>
    );
  }

  if (isUserError) {
    return <StudioPageError />;
  }

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
