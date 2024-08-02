import React, { useEffect } from 'react';
import type { PropsWithChildren } from 'react';

import { useQuery } from '@tanstack/react-query';
import type { UseQueryOptions } from '@tanstack/react-query';

import { delayedContext } from 'src/core/contexts/delayedContext';
import { createQueryContext } from 'src/core/contexts/queryContext';
import { onEntryValuesThatHaveState } from 'src/features/applicationMetadata/appMetadataUtils';
import { VersionErrorOrChildren } from 'src/features/applicationMetadata/VersionErrorOrChildren';
import { fetchApplicationMetadata } from 'src/queries/queries';
import { getInstanceIdRegExp } from 'src/utils/instanceIdRegExp';
import { isAtLeastVersion } from 'src/utils/versionCompare';
import type { ApplicationMetadata, IncomingApplicationMetadata } from 'src/features/applicationMetadata/types';

export const MINIMUM_APPLICATION_VERSION = {
  build: '8.0.0.108',
  name: 'v8.0.0',
};

// Also used for prefetching @see appPrefetcher.ts
export function getApplicationMetadataQueryDef() {
  return {
    queryKey: ['fetchApplicationMetadata'],
    queryFn: fetchApplicationMetadata,
    select: (data) => {
      const onEntry = data.onEntry ?? { show: 'new-instance' };

      return {
        ...data,
        isValidVersion:
          !!data.altinnNugetVersion &&
          isAtLeastVersion({
            actualVersion: data.altinnNugetVersion,
            minimumVersion: MINIMUM_APPLICATION_VERSION.build,
          }),
        onEntry,
        isStatelessApp: isStatelessApp(onEntry.show),
        logoOptions: data.logo,
      };
    },
  } satisfies UseQueryOptions<IncomingApplicationMetadata, Error, ApplicationMetadata>;
}

const useApplicationMetadataQuery = () => {
  const query = useQuery(getApplicationMetadataQueryDef());

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

function isStatelessApp(show: ApplicationMetadata['onEntry']['show']) {
  const expr = getInstanceIdRegExp({ prefix: '/instance' });
  const match = RegExp(expr).exec(window.location.href); // This should probably be reconsidered when changing router.

  // App can be setup as stateless but then go over to a stateful process task
  return match ? false : !!show && !onEntryValuesThatHaveState.includes(show);
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
