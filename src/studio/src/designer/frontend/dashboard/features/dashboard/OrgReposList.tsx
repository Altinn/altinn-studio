import * as React from 'react';

import { RepoList } from 'common/components/RepoList';
import { useGetSearchQuery } from 'services/repoApi';
import { useAppSelector } from 'common/hooks';
import { SelectedContextType } from 'app-shared/navigation/main-header/Header';
import { SelectedContext } from '../../resources/fetchDashboardResources/dashboardSlice';

type GetUidFilter = {
  userId: number;
  selectedContext: SelectedContext;
};

const getUidFilter = ({ selectedContext, userId }: GetUidFilter) => {
  if (selectedContext === SelectedContextType.All) {
    return undefined;
  }

  if (selectedContext === SelectedContextType.Self) {
    return userId;
  }

  return selectedContext;
};

export const OrgReposList = () => {
  const selectedContext = useAppSelector(
    (state) => state.dashboard.selectedContext,
  );
  const userId = useAppSelector((state) => state.dashboard.user.id);

  const uid = getUidFilter({ selectedContext, userId });

  const { data, isLoading: isLoadingOrgRepos } = useGetSearchQuery({
    uid,
  });

  return (
    <div>
      <h1>Org repos</h1>
      <RepoList repos={data?.data} isLoading={isLoadingOrgRepos} />
    </div>
  );
};
