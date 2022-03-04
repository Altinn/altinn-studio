import { getLanguageFromKey } from 'app-shared/utils/language';
import { SelectedContextType } from 'app-shared/navigation/main-header/Header';

import { SelectedContext } from '../../resources/fetchDashboardResources/dashboardSlice';
import { Organizations } from 'services/organizationApi';
import { IRepository } from 'app-shared/types';

type GetUidFilter = {
  userId: number;
  selectedContext: SelectedContext;
};

type GetReposLabel = {
  selectedContext: SelectedContext;
  orgs: Organizations;
  language: any;
};

export type MergeReposProps = {
  repos?: IRepository[];
  starredRepos: IRepository[];
};

export const getUidFilter = ({ selectedContext, userId }: GetUidFilter) => {
  if (selectedContext === SelectedContextType.All) {
    return undefined;
  }

  if (selectedContext === SelectedContextType.Self) {
    return userId;
  }

  return selectedContext;
};

export const getReposLabel = ({
  selectedContext,
  orgs,
  language,
}: GetReposLabel) => {
  if (selectedContext === SelectedContextType.All) {
    return getLanguageFromKey('dashboard.all_apps', language);
  }

  if (selectedContext === SelectedContextType.Self) {
    return getLanguageFromKey('dashboard.my_apps', language);
  }

  const orgName =
    orgs.length > 0
      ? `${orgs.find((org) => org.id === selectedContext).full_name} `
      : '';

  return `${orgName}${getLanguageFromKey('dashboard.apps', language)}`;
};

export const mergeRepos = ({ repos, starredRepos }: MergeReposProps) => {
  if (!repos) {
    return [];
  }

  if (!starredRepos) {
    return repos;
  }

  return repos.map((repo) => {
    return {
      ...repo,
      user_has_starred: starredRepos.find(
        (starredRepo) => starredRepo.id === repo.id,
      )
        ? true
        : false,
    };
  });
};
