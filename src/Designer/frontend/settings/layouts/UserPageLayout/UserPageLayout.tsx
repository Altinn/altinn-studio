import { useParams } from 'react-router-dom';
import { useUserQuery } from 'app-shared/hooks/queries';
import { PageLayout } from '../../features/user/layout/PageLayout';
import { NotFound } from '../../pages/NotFound/NotFound';
import { StudioCenter, StudioPageSpinner } from '@studio/components';
import { StudioPageError } from 'app-shared/components';
import { useTranslation } from 'react-i18next';

export const UserPageLayout = () => {
  const { t } = useTranslation();
  const { owner } = useParams<{ owner: string }>();
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

  if (owner !== user?.login) {
    return <NotFound />;
  }
  return <PageLayout />;
};
