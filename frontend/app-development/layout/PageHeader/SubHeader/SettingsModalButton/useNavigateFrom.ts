import { useLocation } from 'react-router-dom';
import { UrlUtils } from '@studio/pure-functions';
import type { RoutePaths } from 'app-development/enums/RoutePaths';

type LocationState = {
  from?: RoutePaths;
} | null;

export const useNavigateFrom = () => {
  const location = useLocation();
  const state = location.state as LocationState;

  const navigateFrom: RoutePaths | undefined = state?.from ?? undefined;
  const currentRoutePath: string = UrlUtils.extractThirdRouterParam(location.pathname);

  return {
    navigateFrom,
    currentRoutePath,
  };
};
