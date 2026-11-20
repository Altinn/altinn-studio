import { useQuery } from '@tanstack/react-query';

import { useAppQueries } from 'src/core/queries/AppQueriesProvider';

export interface AppFrontendVersions {
  /** Newest first. */
  versions: string[];
  isLoading: boolean;
  isError: boolean;
}

/**
 * The app frontend versions published on app-dist, for choosing one in dev tools. App-dist lists them oldest first,
 * so they are reversed here.
 */
export function useAppFrontendVersionsQuery(): AppFrontendVersions {
  const { fetchAppFrontendVersions } = useAppQueries();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['appFrontendVersions'],
    queryFn: fetchAppFrontendVersions,
    staleTime: Infinity,
  });

  return { versions: data ? [...data].reverse() : [], isLoading, isError };
}
