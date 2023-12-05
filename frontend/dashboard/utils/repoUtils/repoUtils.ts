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

type TranslationMapKey = SelectedContextType | 'named_org' | 'org';
type TranslationMap = Record<TranslationMapKey, string>;
const appsTranslationMap: TranslationMap = {
  all: 'dashboard.all_apps',
  self: 'dashboard.my_apps',
  org: 'dashboard.apps',
  named_org: 'dashboard.org_apps',
};
const datamodelsTranslationMap: TranslationMap = {
  all: 'dashboard.all_datamodels',
  self: 'dashboard.my_datamodels',
  org: 'dashboard.datamodels',
  named_org: 'dashboard.org_datamodels',
};
const resourcesTranslationMap: TranslationMap = {
  all: 'dashboard.all_resources',
  self: 'dashboard.my_resources',
  org: 'dashboard.resources',
  named_org: 'dashboard.org_resources',
};

export const getReposLabel = ({
  selectedContext,
  orgs,
  t,
  isDatamodelsRepo = false,
  isResourcesRepo = false,
}: GetReposLabel): string => {
  const orgName =
    orgs.length > 0 && orgs.find((org) => org.username === selectedContext)?.full_name;

  const concatenatedTranslationMap: TranslationMap = {
    ...appsTranslationMap,
    ...(isDatamodelsRepo && datamodelsTranslationMap),
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
