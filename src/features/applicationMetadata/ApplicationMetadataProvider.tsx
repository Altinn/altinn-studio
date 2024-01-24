import React from 'react';
import type { PropsWithChildren } from 'react';

import { useQuery } from '@tanstack/react-query';

import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';
import { delayedContext } from 'src/core/contexts/delayedContext';
import { createQueryContext } from 'src/core/contexts/queryContext';
import { OldVersionError } from 'src/features/applicationMetadata/OldVersionError';
import type { HttpClientError } from 'src/utils/network/sharedNetworking';

export const MINIMUM_APPLICATION_VERSION = {
  build: '8.0.0.102',
  name: 'v8.0.0-preview.15',
};

const useApplicationMetadataQuery = () => {
  const { fetchApplicationMetadata } = useAppQueries();
  return useQuery({
    queryKey: ['fetchApplicationMetadata'],
    queryFn: () => fetchApplicationMetadata(),
    onError: (error: HttpClientError) => {
      window.logError('Fetching application metadata failed:\n', error);
    },
  });
};

const { Provider, useCtx, useLaxCtx, useHasProvider } = delayedContext(() =>
  createQueryContext({
    name: 'ApplicationMetadata',
    required: true,
    query: useApplicationMetadataQuery,
  }),
);

function VerifyMinimumVersion({ children }: PropsWithChildren) {
  const { altinnNugetVersion } = useApplicationMetadata();

  if (!altinnNugetVersion) {
    return <OldVersionError minVer={MINIMUM_APPLICATION_VERSION.name} />;
  }

  let isMinimumVersion = false;
  const parts = altinnNugetVersion.split('.');
  const expectedParts = MINIMUM_APPLICATION_VERSION.build.split('.');
  for (const i in expectedParts) {
    const part = parseInt(parts[i], 10);
    const expectedPart = parseInt(expectedParts[i], 10);
    if (part >= expectedPart) {
      isMinimumVersion = true;
      break;
    }
  }

  if (!isMinimumVersion) {
    return <OldVersionError minVer={MINIMUM_APPLICATION_VERSION.name} />;
  }

  return children;
}

export function ApplicationMetadataProvider({ children }: PropsWithChildren) {
  return (
    <Provider>
      <VerifyMinimumVersion>{children}</VerifyMinimumVersion>
    </Provider>
  );
}
export const useApplicationMetadata = () => useCtx();
export const useLaxApplicationMetadata = () => useLaxCtx();
export const useHasApplicationMetadata = () => useHasProvider();
