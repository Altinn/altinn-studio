import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';

export const getAppDevelopmentRootRoute = ({ org, repo }: GetRepoUrl): string => {
  return `${window.location.origin}${APP_DEVELOPMENT_BASENAME}/${org}/${repo}/`;
};

type GetRepoUrl = {
  org: string;
  repo: string;
};
