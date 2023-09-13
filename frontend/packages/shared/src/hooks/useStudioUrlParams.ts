import { useParams } from 'react-router-dom';

interface StudioUrlParams {
  org: string;
  app: string;
}

/**
 * Retrieves the org and app names from the URL.
 * @returns {StudioUrlParams} The org and app names.
 */
export const useStudioUrlParams = (): StudioUrlParams => {
  const { org, app } = useParams<Partial<StudioUrlParams>>();
  return { org, app };
};
