import React, { useEffect } from 'react';
import type { PropsWithChildren } from 'react';

import { useQuery } from '@tanstack/react-query';

import { ContextNotProvided } from 'src/core/contexts/context';
import { delayedContext } from 'src/core/contexts/delayedContext';
import { createQueryContext } from 'src/core/contexts/queryContext';
import { onEntryValuesThatHaveState } from 'src/features/applicationMetadata/appMetadataUtils';
import { fetchApplicationMetadata } from 'src/queries/queries';
import type { ApplicationMetadata } from 'src/features/applicationMetadata/types';

// Also used for prefetching @see appPrefetcher.ts
export function getApplicationMetadataQueryDef() {
  return {
    queryKey: ['fetchApplicationMetadata'],
    queryFn: fetchApplicationMetadata,
  };
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

export function useIsStateless() {
  const instancePattern = /^\/instance\/[^/]+\/[^/]+/;
  const hasInstanceGuid = instancePattern.test(window.location.pathname);

  const laxAppMetadata = useLaxApplicationMetadata();
  const show = laxAppMetadata === ContextNotProvided ? undefined : laxAppMetadata.onEntry.show;
  return hasInstanceGuid ? false : !!show && !onEntryValuesThatHaveState.includes(show);
}

export function ApplicationMetadataProvider({ children }: PropsWithChildren) {
  return <Provider>{children}</Provider>;
}

export const useApplicationMetadata = () => useCtx();
export const useLaxApplicationMetadata = () => useLaxCtx();
export const useHasApplicationMetadata = () => useHasProvider();
