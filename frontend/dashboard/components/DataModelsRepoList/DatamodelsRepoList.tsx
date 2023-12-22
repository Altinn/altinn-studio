import React from 'react';
import { RepoList } from '../RepoList';
import { getReposLabel } from '../../utils/repoUtils';
import { getUidFilter } from '../../utils/filterUtils';
import { useTranslation } from 'react-i18next';
import { User } from 'app-shared/types/Repository';
import { Organization } from 'app-shared/types/Organization';
import { useSearchReposQuery } from 'dashboard/hooks/queries/useSearchReposQuery';
import { Repository } from 'app-shared/types/Repository';
import { useSelectedContext } from 'dashboard/hooks/useSelectedContext';
import { Heading } from '@digdir/design-system-react';

type DataModelsReposListProps = {
  user: User;
  organizations: Organization[];
  starredRepos: Repository[];
};
export const DatamodelsReposList = ({
  user,
  organizations,
  starredRepos,
}: DataModelsReposListProps) => {
  const selectedContext = useSelectedContext();
  const { t } = useTranslation();

  const uid = getUidFilter({
    selectedContext,
    userId: user.id,
    organizations,
  });

  const { data: repos, isPending: isPendingOrgRepos } = useSearchReposQuery({
    uid: uid as number,
    keyword: '-datamodels',
    page: 0,
  });

  if (!repos?.data.length) {
    return null;
  }

  return (
    <div>
      <Heading level={2} size='small' spacing>
        {getReposLabel({ selectedContext, orgs: organizations, t, isDatamodelsRepo: true })}
      </Heading>
      <RepoList repos={repos?.data} isLoading={isPendingOrgRepos} pageSize={5} rowCount={2} />
    </div>
  );
};
