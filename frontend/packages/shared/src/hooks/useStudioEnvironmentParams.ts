import { useParams } from 'react-router-dom';
import type { AppRouteParams } from 'app-shared/types/AppRouteParams';

/**
 * Retrieves the org and app names from the URL.
 * @returns {StudioUrlParams} The org and app names.
 */
export const useStudioEnvironmentParams = (): AppRouteParams => {
  const { org, app } = useParams<Partial<AppRouteParams>>();
  return { org, app };
};
