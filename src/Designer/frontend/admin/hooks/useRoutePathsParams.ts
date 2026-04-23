import { useParams } from 'react-router-dom';
import type { RoutePathsParams } from 'admin/routes/RoutePathsParams';

export const useRoutePathsParams = (): RoutePathsParams => {
  return useParams<RoutePathsParams>() as RoutePathsParams;
};
