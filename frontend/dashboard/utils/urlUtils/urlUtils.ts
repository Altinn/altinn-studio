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

export function extractLastRouterParam(pathname: string): string {
  const pathnameArray = pathname.split('/');
  const lastParam: string = pathnameArray[pathnameArray.length - 1];
  return lastParam;
}

export function extractSecondLastRouterParam(pathname: string): string {
  const pathnameArray = pathname.split('/');
  const secondLastParam: string | undefined = pathnameArray[pathnameArray.length - 2];

  if (secondLastParam) return secondLastParam;
  return '';
}
