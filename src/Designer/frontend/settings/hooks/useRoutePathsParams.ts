import { useParams } from 'react-router-dom';
import type { RoutePathsParams } from 'settings/routes/RoutePathsParams';

export const useRoutePathsParams = (): RoutePathsParams => {
  return useParams<RoutePathsParams>() as RoutePathsParams;
};
