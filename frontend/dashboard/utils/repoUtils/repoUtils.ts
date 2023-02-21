import { SelectedContextType } from 'app-shared/navigation/main-header/Header';
import type { IRepository } from 'app-shared/types/global';
import type { SelectedContext } from '../../resources/fetchDashboardResources/dashboardSlice';
import type { Organizations } from '../../services/organizationApi';
import i18next from 'i18next';

type GetReposLabel = {
  selectedContext: SelectedContext;
  orgs: Organizations;
  t: typeof i18next.t;
  isDatamodelsRepo?: boolean;
};

export type MergeReposProps = {
  repos?: IRepository[];
  starredRepos: IRepository[];
};

export const getReposLabel = ({
  selectedContext,
  orgs,
  t,
  isDatamodelsRepo = false,
}: GetReposLabel) => {
  if (selectedContext === SelectedContextType.All) {
    return isDatamodelsRepo ? t('dashboard.all_datamodels') : t('dashboard.all_apps');
  }

  if (selectedContext === SelectedContextType.Self) {
    return isDatamodelsRepo ? t('dashboard.my_datamodels') : t('dashboard.my_apps');
  }

  const orgName =
    orgs.length > 0 ? `${orgs.find((org) => org.id === selectedContext).full_name} ` : '';

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
      user_has_starred: starredRepos.find((starredRepo) => starredRepo.id === repo.id)
        ? true
        : false,
    };
  });
};

export const validateRepoName = (repoName: string) => {
  const appNameRegex = /^(?!datamodels$)[a-z][a-z0-9-]{1,28}[a-z0-9]$/;
  return appNameRegex.test(repoName);
};
