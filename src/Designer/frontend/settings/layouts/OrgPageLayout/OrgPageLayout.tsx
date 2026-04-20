import { useUserQuery } from 'app-shared/hooks/queries';
import { PageLayout } from '../../features/orgs/layout/PageLayout';
import { NotFound } from '../../components/NotFound/NotFound';
import { StudioCenter, StudioPageSpinner } from '@studio/components';
import { StudioPageError } from 'app-shared/components';
import { useTranslation } from 'react-i18next';
import { useRoutePathsParams } from 'settings/hooks/useRoutePathsParams';

export const OrgPageLayout = () => {
  const { t } = useTranslation();
  const { owner: org } = useRoutePathsParams();
  const { data: user, isPending, isError } = useUserQuery();

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

  return <PageLayout />;
};
