import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';
import { RepositoryType } from 'app-shared/types/global';
import { getRepositoryType } from 'app-shared/utils/repository';

export const getAppDevelopmentRootRoute = ({ org, repo }: GetRepoUrl): string => {
  return `${window.location.origin}${APP_DEVELOPMENT_BASENAME}/${org}/${repo}/`;
};

type GetRepoUrl = {
  org: string;
  repo: string;
};

export const getRepoEditUrl = ({ org, repo }: GetRepoUrl): string => {
  if (getRepositoryType(org, repo) === RepositoryType.DataModels) {
    return `${APP_DEVELOPMENT_BASENAME}/${org}/${repo}/data-model`;
  }

  return `${APP_DEVELOPMENT_BASENAME}/${org}/${repo}`;
};
