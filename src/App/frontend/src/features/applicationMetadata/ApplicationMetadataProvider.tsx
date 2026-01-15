import React, { useEffect } from 'react';
import type { PropsWithChildren } from 'react';

import { useQuery } from '@tanstack/react-query';
import type { UseQueryOptions } from '@tanstack/react-query';

import { delayedContext } from 'src/core/contexts/delayedContext';
import { createQueryContext } from 'src/core/contexts/queryContext';
import { onEntryValuesThatHaveState } from 'src/features/applicationMetadata/appMetadataUtils';
import { VersionErrorOrChildren } from 'src/features/applicationMetadata/VersionErrorOrChildren';
import { useNavigationParam } from 'src/hooks/navigation';
import { fetchApplicationMetadata } from 'src/queries/queries';
import type { ApplicationMetadata, IncomingApplicationMetadata } from 'src/features/applicationMetadata/types';

// Also used for prefetching @see appPrefetcher.ts
export function getApplicationMetadataQueryDef(instanceGuid: string | undefined) {
  return {
    queryKey: ['fetchApplicationMetadata'],
    queryFn: fetchApplicationMetadata,
    select: (data) => ({
      ...data,
      isValidVersion: true, // TODO: Add version check when we know the next version (v9 or v10?)
      isStateless: isStatelessApp(!!instanceGuid, data.onEntry.show),
    }),
  } satisfies UseQueryOptions<IncomingApplicationMetadata, Error, ApplicationMetadata>;
}

const useApplicationMetadataQuery = () => {
  const instanceGuid = useNavigationParam('instanceGuid');
  const query = useQuery(getApplicationMetadataQueryDef(instanceGuid));

  useEffect(() => {
    query.error && window.logError('Fetching application metadata failed:\n', query.error);
  }, [query.error]);

  return query;
};

const { Provider, useCtx, useLaxCtx, useHasProvider } = delayedContext(() =>
  createQueryContext<ApplicationMetadata, true>({
    name: 'ApplicationMetadata',
    required: true,
    query: useApplicationMetadataQuery,
  }),
);

function isStatelessApp(hasInstanceGuid: boolean, show: ApplicationMetadata['onEntry']['show']) {
  // App can be setup as stateless but then go over to a stateful process task
  return hasInstanceGuid ? false : !!show && !onEntryValuesThatHaveState.includes(show);
}

export function ApplicationMetadataProvider({ children }: PropsWithChildren) {
  return (
    <Provider>
      <VersionErrorOrChildren>{children}</VersionErrorOrChildren>
    </Provider>
  );
}

export const useApplicationMetadata = () => useCtx();
export const useLaxApplicationMetadata = () => useLaxCtx();
export const useHasApplicationMetadata = () => useHasProvider();
