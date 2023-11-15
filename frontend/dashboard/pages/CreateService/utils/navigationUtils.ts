import { getAppDevelopmentRootRoute } from '../../../utils/urlUtils';

export const navigateToAppDevelopment = (org: string, repo: string): void => {
  const appDevelopmentRootRoute: string = getAppDevelopmentRootRoute({ org, repo });
  window.location.assign(appDevelopmentRootRoute);
};
