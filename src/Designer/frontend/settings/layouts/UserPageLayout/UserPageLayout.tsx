import { useUserQuery } from 'app-shared/hooks/queries';
import { PageLayout } from '../../features/user/layout/PageLayout';
import { NotFound } from '../../components/NotFound/NotFound';
import { StudioCenter, StudioPageSpinner } from '@studio/components';
import { StudioPageError } from 'app-shared/components';
import { useTranslation } from 'react-i18next';
import { useRequiredRoutePathsParams } from 'settings/hooks/useRequiredRoutePathsParams';
import { useEnvironmentConfig } from 'app-shared/contexts/EnvironmentConfigContext';
import { FeatureFlag, useFeatureFlag } from '@studio/feature-flags';

export const UserPageLayout = () => {
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

  if (owner !== user?.login) {
    return <NotFound />;
  }

  if (!studioOidc && !isAdminEnabled) {
    return <NotFound />;
  }

  return <PageLayout />;
};
