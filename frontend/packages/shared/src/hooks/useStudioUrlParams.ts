import { useParams } from 'react-router-dom';
import type { StudioUrlParams } from 'app-shared/types/StudioUrlParams';

/**
 * Retrieves the org and app names from the URL.
 * @returns {StudioUrlParams} The org and app names.
 */
export const useStudioUrlParams = (): StudioUrlParams => {
  const { org, app } = useParams<Partial<StudioUrlParams>>();
  return { org, app };
};
