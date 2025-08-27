import React from 'react';
import { RepoList } from '../RepoList';
import { getReposLabel } from '../../utils/repoUtils';
import { getUidFilter } from '../../utils/filterUtils';
import { useAugmentReposWithStarred } from '../../hooks/useAugmentReposWithStarred';
import { useTranslation } from 'react-i18next';
import type { User } from 'app-shared/types/Repository';
import type { Organization } from 'app-shared/types/Organization';
import { useSearchReposQuery } from '../../hooks/queries/useSearchReposQuery';
import { useSelectedContext } from '../../hooks/useSelectedContext';
import { Heading } from '@digdir/designsystemet-react';
import { useStarredReposQuery } from '../../hooks/queries';
import { DATA_MODEL_REPO_IDENTIFIER } from '../../constants';
import { TableSortStorageKey } from '../../types/TableSortStorageKey';

type DataModelsReposListProps = {
  user: User;
  organizations: Organization[];
};
export const DataModelsReposList = ({ user, organizations }: DataModelsReposListProps) => {
  const selectedContext = useSelectedContext();
  const { t } = useTranslation();

  const uid = getUidFilter({
    selectedContext,
    userId: user.id,
    organizations,
  });

  const { data: starredRepos = [], isPending: hasPendingStarredRepos } = useStarredReposQuery();
  const { data: dataModelRepos, isPending: hasPendingDataModels } = useSearchReposQuery({
    uid: uid as number,
    keyword: DATA_MODEL_REPO_IDENTIFIER,
  });

  const dataModelsIncludingStarredData = useAugmentReposWithStarred({
    repos: dataModelRepos?.data,
    starredRepos,
  });

  if (!dataModelsIncludingStarredData.length) {
    return null;
  }

  return (
    <div>
      <Heading level={2} size='small' spacing>
        {getReposLabel({ selectedContext, orgs: organizations, t, isDataModelsRepo: true })}
      </Heading>
      <RepoList
        repos={dataModelsIncludingStarredData}
        isLoading={hasPendingDataModels || hasPendingStarredRepos}
        sortStorageKey={TableSortStorageKey.DataModelRepos}
      />
    </div>
  );
};
