import { useParams } from 'react-router-dom';
import type { AppRouteParams } from 'app-shared/types/AppRouteParams';

export const useStudioEnvironmentParams = (): AppRouteParams => {
  const { org, app } = useParams<Partial<AppRouteParams>>();
  return { org, app };
};
