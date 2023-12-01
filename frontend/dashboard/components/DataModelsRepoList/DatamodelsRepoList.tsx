import React from 'react';
import { RepoList } from '../RepoList';
import { getReposLabel } from '../../utils/repoUtils';
import { getUidFilter } from '../../utils/filterUtils';
import { useAugmentReposWithStarred } from '../../hooks/useAugmentReposWithStarred';
import { useTranslation } from 'react-i18next';
import { User } from 'app-shared/types/User';
import { Organization } from 'app-shared/types/Organization';
import { useSearchReposQuery } from 'dashboard/hooks/queries/useSearchReposQuery';
import { IRepository } from 'app-shared/types/global';
import { useSelectedContext } from 'dashboard/hooks/useSelectedContext';
import { Heading } from '@digdir/design-system-react';

type DataModelsReposListProps = {
  user: User;
  organizations: Organization[];
  starredRepos: IRepository[];
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

  const reposWithStarred = useAugmentReposWithStarred({
    repos: repos?.data,
    starredRepos,
  });

  if (!reposWithStarred.length) {
    return null;
  }

  return (
    <div>
      <Heading level={2} size='small' spacing>
        {getReposLabel({ selectedContext, orgs: organizations, t, isDatamodelsRepo: true })}
      </Heading>
      <RepoList repos={reposWithStarred} isLoading={isPendingOrgRepos} pageSize={5} rowCount={2} />
    </div>
  );
};
