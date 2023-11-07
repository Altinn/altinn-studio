import { getAppDevelopmentRootRoute } from '../../../utils/urlUtils';

type UseNavigateToAppDevelopment = {
  navigateToAppDevelopment: (org: string, app: string) => void;
};
export const useNavigateToAppDevelopment = (): UseNavigateToAppDevelopment => {
  const navigateToAppDevelopment = (org: string, repo: string): void => {
    const appDevelopmentRootRoute: string = getAppDevelopmentRootRoute({ org, repo });
    window.location.assign(appDevelopmentRootRoute);
  };

  return { navigateToAppDevelopment };
};
