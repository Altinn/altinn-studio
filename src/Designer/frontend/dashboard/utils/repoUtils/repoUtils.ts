import { SelectedContextType } from '../../enums/SelectedContextType';
import type { Repository } from 'app-shared/types/Repository';
import type { Organization } from 'app-shared/types/Organization';
import type i18next from 'i18next';

type GetReposLabel = {
  selectedContext: string | SelectedContextType;
  orgs: Organization[];
  t: typeof i18next.t;
  isDataModelsRepo?: boolean;
  isResourcesRepo?: boolean;
};

export type MergeReposProps = {
  repos?: Repository[];
  starredRepos: Repository[];
};

export type RepoIncludingStarredData = Repository & { hasStarred?: boolean };

type TranslationMapKey = SelectedContextType | 'named_org' | 'org';
type TranslationMap = Record<TranslationMapKey, string>;
const appsTranslationMap: TranslationMap = {
  all: 'dashboard.all_apps',
  self: 'dashboard.my_apps',
  org: 'dashboard.apps',
  none: 'undefined',
  named_org: 'dashboard.org_apps',
};
const dataModelsTranslationMap: TranslationMap = {
  all: 'dashboard.all_data_models',
  self: 'dashboard.my_data_models',
  org: 'dashboard.data_models',
  none: 'undefined',
  named_org: 'dashboard.org_data_models',
};
const resourcesTranslationMap: TranslationMap = {
  all: 'dashboard.all_resources',
  self: 'dashboard.my_resources',
  org: 'dashboard.resources',
  none: 'undefined',
  named_org: 'dashboard.org_resources',
};

export const getReposLabel = ({
  selectedContext,
  orgs,
  t,
  isDataModelsRepo = false,
  isResourcesRepo = false,
}: GetReposLabel): string => {
  const orgName =
    orgs.length > 0 && orgs.find((org) => org.username === selectedContext)?.full_name;

  const concatenatedTranslationMap: TranslationMap = {
    ...appsTranslationMap,
    ...(isDataModelsRepo && dataModelsTranslationMap),
    ...(isResourcesRepo && resourcesTranslationMap),
  };

  if (selectedContext === SelectedContextType.All) {
    return t(concatenatedTranslationMap.all);
  }
  if (selectedContext === SelectedContextType.Self) {
    return t(concatenatedTranslationMap.self);
  }
  return orgName
    ? t(concatenatedTranslationMap.named_org, { orgName })
    : t(concatenatedTranslationMap.org);
};

export const mergeRepos = ({
  repos,
  starredRepos,
}: MergeReposProps): RepoIncludingStarredData[] => {
  if (!repos) {
    return [];
  }

  if (!starredRepos) {
    return repos;
  }

  return repos.map((repo) => {
    return {
      ...repo,
      hasStarred: !!starredRepos.find((starredRepo) => starredRepo.id === repo.id),
    };
  });
};

export const validateRepoName = (repoName: string) => {
  const appNameRegex = /^(?!datamodels$)[a-z][a-z0-9-]{1,28}[a-z0-9]$/;
  return appNameRegex.test(repoName);
};
