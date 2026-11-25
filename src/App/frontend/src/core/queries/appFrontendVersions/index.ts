import { useQuery } from '@tanstack/react-query';

import { useAppQueries } from 'src/core/queries/AppQueriesProvider';

export interface AppFrontendVersions {
  /** Newest first. */
  versions: string[];
  isLoading: boolean;
  isError: boolean;
}

/** App-dist lists the versions oldest first. Outside the hook, so the query reverses them only when they change. */
const newestFirst = (versions: string[]) => [...versions].reverse();

/** The app frontend versions published on app-dist, for choosing one in dev tools. */
export function useAppFrontendVersionsQuery(): AppFrontendVersions {
  const { fetchAppFrontendVersions } = useAppQueries();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['appFrontendVersions'],
    queryFn: fetchAppFrontendVersions,
    select: newestFirst,
    staleTime: Infinity,
  });

  return { versions: data ?? [], isLoading, isError };
}
