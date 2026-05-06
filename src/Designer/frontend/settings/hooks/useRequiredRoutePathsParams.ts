import type { RoutePathsParams } from 'settings/routes/RoutePathsParams';
import { useRequiredParams } from 'app-shared/hooks/useRequiredParams';

type RoutePathParamKey = keyof RoutePathsParams;

export const useRequiredRoutePathsParams = <K extends RoutePathParamKey>(
  requiredParams: K | readonly K[],
): Pick<RoutePathsParams, K> => {
  return useRequiredParams<RoutePathsParams, K>(requiredParams);
};
