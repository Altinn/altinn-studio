import { useParams } from 'react-router-dom';
import { useUserQuery } from 'app-shared/hooks/queries';
import { PageLayout } from '../../features/user/layout/PageLayout';
import { NotFound } from '../../pages/NotFound/NotFound';

export const UserPageLayout = () => {
  const { owner } = useParams<{ owner: string }>();
  const { data: user, isPending } = useUserQuery();

  if (!isPending && owner !== user?.login) {
    return <NotFound />;
  }
  return <PageLayout />;
};
