import { getLanguageFromKey } from 'app-shared/utils/language';
import { SelectedContextType } from 'app-shared/navigation/main-header/Header';
import type { SelectedContext } from '../../resources/fetchDashboardResources/dashboardSlice';
import type { IRepository } from 'app-shared/types/global';
import type { Organizations } from '../../services/organizationApi';

type GetUidFilter = {
  userId: number;
  selectedContext: SelectedContext;
};

type GetReposLabel = {
  selectedContext: SelectedContext;
  orgs: Organizations;
  language: any;
  isDatamodelsRepo?: boolean;
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
  isDatamodelsRepo = false,
}: GetReposLabel) => {
  const t = (key: string) => getLanguageFromKey(key, language);
  if (selectedContext === SelectedContextType.All) {
    return isDatamodelsRepo ? t('dashboard.all_datamodels') : t('dashboard.all_apps');
  }

  if (selectedContext === SelectedContextType.Self) {
    return isDatamodelsRepo ? t('dashboard.my_datamodels') : t('dashboard.my_apps');
  }

  const orgName =
    orgs.length > 0
      ? `${orgs.find((org) => org.id === selectedContext).full_name} `
      : '';

  const reposLabel = isDatamodelsRepo ? t('dashboard.datamodels') : t('dashboard.apps');
  return `${orgName}${reposLabel}`;
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
        (starredRepo) => starredRepo.id === repo.id
      )
        ? true
        : false,
    };
  });
};
