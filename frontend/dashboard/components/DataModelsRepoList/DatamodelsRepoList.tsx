import React from 'react';
import { RepoList } from '../RepoList';
import { getReposLabel } from '../../utils/repoUtils';
import { getUidFilter } from '../../utils/filterUtils';
import { useAugmentReposWithStarred } from '../../hooks/useAugmentReposWithStarred';
import { useTranslation } from 'react-i18next';
import { User } from 'dashboard/services/userService';
import { Organization } from 'dashboard/services/organizationService';
import { useSearchReposQuery } from 'dashboard/hooks/useRepoQueries';
import { IRepository } from 'app-shared/types/global';
import { useAppContext } from '../../contexts/appContext';

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
  const { selectedContext } = useAppContext();
  const { t } = useTranslation();

  const uid = getUidFilter({
    selectedContext,
    userId: user.id,
  });

  const { data: repos, isLoading: isLoadingOrgRepos } = useSearchReposQuery({
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
    <div data-testid='datamodels-repos-list'>
      <h2>{getReposLabel({ selectedContext, orgs: organizations, t, isDatamodelsRepo: true })}</h2>
      <RepoList repos={reposWithStarred} isLoading={isLoadingOrgRepos} pageSize={5} rowCount={2} />
    </div>
  );
};
