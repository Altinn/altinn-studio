import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';

export const getAppDevelopmentRootRoute = ({ org, repo }: GetRepoUrl): string => {
  return `${window.location.origin}${APP_DEVELOPMENT_BASENAME}/${org}/${repo}/`;
};

type GetRepoUrl = {
  org: string;
  repo: string;
};

type GetAppUpgradePath = {
  subroute: string;
  selectedContext: string;
  org: string;
  app: string;
};

export const getAppUpgradePath = ({
  subroute,
  selectedContext,
  org,
  app,
}: GetAppUpgradePath): string => `/${subroute}/${selectedContext}/${org}/${app}/upgrade`;
