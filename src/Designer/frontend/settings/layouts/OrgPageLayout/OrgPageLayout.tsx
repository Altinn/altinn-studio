import { useUserQuery } from 'app-shared/hooks/queries';
import { PageLayout } from '../../features/orgs/layout/PageLayout';
import { NotFound } from '../../components/NotFound/NotFound';
import { StudioCenter, StudioPageSpinner } from '@studio/components';
import { StudioPageError } from 'app-shared/components';
import { useTranslation } from 'react-i18next';
import { useRequiredRoutePathsParams } from 'settings/hooks/useRequiredRoutePathsParams';
import { useEnvironmentConfig } from 'app-shared/contexts/EnvironmentConfigContext';
import { FeatureFlag, useFeatureFlag } from '@studio/feature-flags';

export const OrgPageLayout = () => {
  const { t } = useTranslation();
  const { owner: org } = useRequiredRoutePathsParams(['owner']);
  const { data: user, isPending, isError } = useUserQuery();
  const { environment } = useEnvironmentConfig();
  const studioOidc = environment?.featureFlags?.studioOidc;
  const isAdminEnabled = useFeatureFlag(FeatureFlag.Admin);

  if (isPending) {
    return (
      <StudioCenter>
        <StudioPageSpinner spinnerTitle={t('general.loading')} />
      </StudioCenter>
    );
  }

  if (isError) {
    return <StudioPageError />;
  }

  if (org === user?.login) {
    return <NotFound />;
  }

  if (!studioOidc && !isAdminEnabled) {
    return <NotFound />;
  }

  return <PageLayout />;
};
