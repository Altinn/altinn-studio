import { useUserQuery } from 'app-shared/hooks/queries';
import { PageLayout } from '../../features/user/layout/PageLayout';
import { NotFound } from '../../components/NotFound/NotFound';
import { StudioCenter, StudioPageSpinner } from '@studio/components';
import { StudioPageError } from 'app-shared/components';
import { useTranslation } from 'react-i18next';
import { useRequiredRoutePathsParams } from 'settings/hooks/useRequiredRoutePathsParams';
import { StringUtils } from '@studio/pure-functions';

export const UserPageLayout = () => {
  const { t } = useTranslation();
  const { owner } = useRequiredRoutePathsParams(['owner']);
  const { data: user, isPending: isUserPending, isError: isUserError } = useUserQuery();

  if (isUserPending) {
    return (
      <StudioCenter>
        <StudioPageSpinner spinnerTitle={t('general.loading')} />
      </StudioCenter>
    );
  }

  if (isUserError) {
    return <StudioPageError />;
  }

  if (!StringUtils.areCaseInsensitiveEqual(owner, user?.login ?? '')) {
    return <NotFound />;
  }

  return <PageLayout />;
};
