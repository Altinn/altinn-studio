import { SelectedContextType } from 'app-shared/navigation/main-header/Header';
import type { IRepository } from 'app-shared/types/global';
import { Organization } from 'app-shared/types/Organization';
import i18next from 'i18next';

type GetReposLabel = {
  selectedContext: string | SelectedContextType;
  orgs: Organization[];
  t: typeof i18next.t;
  isDatamodelsRepo?: boolean;
  isResourcesRepo?: boolean;
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
  isResourcesRepo = false,
}: GetReposLabel) => {
  const orgName =
    orgs.length > 0 && orgs.find((org) => org.username === selectedContext)?.full_name;
  const stringsConfig = {
    all: t('dashboard.all_apps'),
    mine: t('dashboard.my_apps'),
    org: orgName ? t('dashboard.org_apps', { orgName }) : t('dashboard.apps'),
    ...(isDatamodelsRepo && {
      all: t('dashboard.all_datamodels'),
      mine: t('dashboard.my_datamodels'),
      org: orgName ? t('dashboard.org_datamodels', { orgName }) : t('dashboard.datamodels'),
    }),
    ...(isResourcesRepo && {
      all: t('dashboard.all_resources'),
      mine: t('dashboard.my_resources'),
      org: orgName ? t('dashboard.org_resources', { orgName }) : t('dashboard.resources'),
    }),
  };

  if (selectedContext === SelectedContextType.All) {
    return stringsConfig.all;
  }
  if (selectedContext === SelectedContextType.Self) {
    return stringsConfig.mine;
  }
  return stringsConfig.org;
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
      user_has_starred: !!starredRepos.find((starredRepo) => starredRepo.id === repo.id),
    };
  });
};

export const validateRepoName = (repoName: string) => {
  const appNameRegex = /^(?!datamodels$)[a-z][a-z0-9-]{1,28}[a-z0-9]$/;
  return appNameRegex.test(repoName);
};
