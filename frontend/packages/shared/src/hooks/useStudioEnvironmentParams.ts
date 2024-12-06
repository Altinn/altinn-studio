import { useParams } from 'react-router-dom';

interface StudioEnvironmentParams {
  org: string;
  app: string;
}

/**
 * Retrieves the org and app names from the URL.
 * @returns {StudioUrlParams} The org and app names.
 */
export const useStudioEnvironmentParams = (): StudioEnvironmentParams => {
  const { org, app } = useParams<Partial<StudioEnvironmentParams>>();
  return { org, app };
};
